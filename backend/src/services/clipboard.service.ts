import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../orm/client.js';
import { clipboardRecords } from '../orm/schema/index.js';
import type { ClipboardRecord, PaginatedResult } from '../types/index.js';

function mapRecord(row: typeof clipboardRecords.$inferSelect): ClipboardRecord {
  return {
    id: row.id,
    content: row.content,
    created_at: row.createdAt,
  };
}

export async function listClipboardRecords(
  page = 1,
  pageSize = 10,
): Promise<PaginatedResult<ClipboardRecord>> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const offset = (safePage - 1) * safePageSize;

  const database = getDb();
  const [countRow] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(clipboardRecords);
  const total = countRow?.count ?? 0;

  const rows = await database
    .select()
    .from(clipboardRecords)
    .orderBy(desc(clipboardRecords.id))
    .limit(safePageSize)
    .offset(offset);

  return {
    records: rows.map(mapRecord),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

export async function getClipboardRecordById(id: number): Promise<ClipboardRecord | null> {
  const [row] = await getDb()
    .select()
    .from(clipboardRecords)
    .where(eq(clipboardRecords.id, id))
    .limit(1);
  return row ? mapRecord(row) : null;
}

export async function createClipboardRecord(content: string): Promise<ClipboardRecord> {
  const [row] = await getDb()
    .insert(clipboardRecords)
    .values({ content })
    .returning();
  return mapRecord(row);
}

export async function deleteClipboardRecord(id: number): Promise<boolean> {
  const deleted = await getDb()
    .delete(clipboardRecords)
    .where(eq(clipboardRecords.id, id))
    .returning();
  return deleted.length > 0;
}

export async function clearClipboardRecords(): Promise<void> {
  await getDb().delete(clipboardRecords);
}
