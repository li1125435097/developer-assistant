import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { getDb } from '../orm/client.js';
import {
  notebookNoteTags,
  notebookNotes,
  notebookTags,
} from '../orm/schema/index.js';
import type {
  CreateNotebookInput,
  NotebookNote,
  NotebookTag,
  PaginatedResult,
  UpdateNotebookInput,
} from '../types/index.js';

function mapTag(row: typeof notebookTags.$inferSelect): NotebookTag {
  return { id: row.id, name: row.name };
}

async function getTagsByNoteIds(noteIds: number[]): Promise<Map<number, NotebookTag[]>> {
  const result = new Map<number, NotebookTag[]>();
  if (!noteIds.length) return result;

  const rows = await getDb()
    .select({
      noteId: notebookNoteTags.noteId,
      tag: notebookTags,
    })
    .from(notebookNoteTags)
    .innerJoin(notebookTags, eq(notebookNoteTags.tagId, notebookTags.id))
    .where(inArray(notebookNoteTags.noteId, noteIds));

  for (const row of rows) {
    const tags = result.get(row.noteId) ?? [];
    tags.push(mapTag(row.tag));
    result.set(row.noteId, tags);
  }

  return result;
}

function mapNote(
  row: typeof notebookNotes.$inferSelect,
  tags: NotebookTag[],
): NotebookNote {
  return {
    id: row.id,
    content: row.content,
    pinned: row.pinned,
    tags,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

async function syncNoteTags(noteId: number, tagNames: string[]): Promise<void> {
  const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
  const database = getDb();

  await database.delete(notebookNoteTags).where(eq(notebookNoteTags.noteId, noteId));

  for (const name of uniqueNames) {
    const [existing] = await database
      .select()
      .from(notebookTags)
      .where(eq(notebookTags.name, name))
      .limit(1);

    const tag =
      existing ??
      (
        await database.insert(notebookTags).values({ name }).returning()
      )[0];

    await database.insert(notebookNoteTags).values({ noteId, tagId: tag.id });
  }
}

export async function listNotebookNotes(
  page = 1,
  pageSize = 10,
  search = '',
  tagSearch = '',
): Promise<PaginatedResult<NotebookNote>> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const offset = (safePage - 1) * safePageSize;
  const keyword = search.trim();
  const tagKeyword = tagSearch.trim();
  const database = getDb();

  const conditions = [];
  if (keyword) {
    conditions.push(ilike(notebookNotes.content, `%${keyword}%`));
  }
  if (tagKeyword) {
    conditions.push(
      inArray(
        notebookNotes.id,
        database
          .select({ noteId: notebookNoteTags.noteId })
          .from(notebookNoteTags)
          .innerJoin(notebookTags, eq(notebookNoteTags.tagId, notebookTags.id))
          .where(ilike(notebookTags.name, `%${tagKeyword}%`)),
      ),
    );
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [countRow] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(notebookNotes)
    .where(whereClause);
  const total = countRow?.count ?? 0;

  const rows = await database
    .select()
    .from(notebookNotes)
    .where(whereClause)
    .orderBy(desc(notebookNotes.pinned), desc(notebookNotes.updatedAt))
    .limit(safePageSize)
    .offset(offset);

  const tagsMap = await getTagsByNoteIds(rows.map((row) => row.id));

  return {
    records: rows.map((row) => mapNote(row, tagsMap.get(row.id) ?? [])),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

export async function getNotebookNoteById(id: number): Promise<NotebookNote | null> {
  const [row] = await getDb()
    .select()
    .from(notebookNotes)
    .where(eq(notebookNotes.id, id))
    .limit(1);

  if (!row) return null;

  const tagsMap = await getTagsByNoteIds([row.id]);
  return mapNote(row, tagsMap.get(row.id) ?? []);
}

export async function createNotebookNote(input: CreateNotebookInput): Promise<NotebookNote> {
  const database = getDb();
  const [row] = await database
    .insert(notebookNotes)
    .values({ content: input.content })
    .returning();

  if (input.tags?.length) {
    await syncNoteTags(row.id, input.tags);
  }

  const tagsMap = await getTagsByNoteIds([row.id]);
  return mapNote(row, tagsMap.get(row.id) ?? []);
}

export async function updateNotebookNote(
  id: number,
  input: UpdateNotebookInput,
): Promise<NotebookNote | null> {
  const database = getDb();
  const updates: Partial<typeof notebookNotes.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (input.content !== undefined) {
    updates.content = input.content;
  }

  const [row] = await database
    .update(notebookNotes)
    .set(updates)
    .where(eq(notebookNotes.id, id))
    .returning();

  if (!row) return null;

  if (input.tags !== undefined) {
    await syncNoteTags(id, input.tags);
  }

  const tagsMap = await getTagsByNoteIds([id]);
  return mapNote(row, tagsMap.get(id) ?? []);
}

export async function deleteNotebookNote(id: number): Promise<boolean> {
  const database = getDb();
  await database.delete(notebookNoteTags).where(eq(notebookNoteTags.noteId, id));
  const deleted = await database
    .delete(notebookNotes)
    .where(eq(notebookNotes.id, id))
    .returning();
  return deleted.length > 0;
}

export async function toggleNotebookPin(id: number): Promise<NotebookNote | null> {
  const database = getDb();
  const [existing] = await database
    .select()
    .from(notebookNotes)
    .where(eq(notebookNotes.id, id))
    .limit(1);

  if (!existing) return null;

  const [row] = await database
    .update(notebookNotes)
    .set({
      pinned: !existing.pinned,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(notebookNotes.id, id))
    .returning();

  const tagsMap = await getTagsByNoteIds([id]);
  return mapNote(row, tagsMap.get(id) ?? []);
}

export async function listNotebookTags(search = ''): Promise<NotebookTag[]> {
  const keyword = search.trim();
  const database = getDb();

  const rows = keyword
    ? await database
        .select()
        .from(notebookTags)
        .where(ilike(notebookTags.name, `%${keyword}%`))
        .orderBy(notebookTags.name)
    : await database.select().from(notebookTags).orderBy(notebookTags.name);

  return rows.map(mapTag);
}
