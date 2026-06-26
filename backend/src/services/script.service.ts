import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../orm/client.js';
import { scripts } from '../orm/schema/index.js';
import type {
  CreateScriptInput,
  Script,
  ScriptAction,
  UpdateScriptInput,
} from '../types/index.js';

function mapScript(row: typeof scripts.$inferSelect): Script {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    platform: row.platform,
    actions: row.actions,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function normalizeActions(actions: ScriptAction[]): ScriptAction[] {
  return actions.map((item) => ({
    action: item.action.trim(),
    script: item.script.trim(),
  }));
}

export async function listScripts(): Promise<Script[]> {
  const rows = await getDb().select().from(scripts).orderBy(desc(scripts.id));
  return rows.map(mapScript);
}

export async function getScriptById(id: number): Promise<Script | null> {
  const [row] = await getDb().select().from(scripts).where(eq(scripts.id, id)).limit(1);
  return row ? mapScript(row) : null;
}

export async function createScript(input: CreateScriptInput): Promise<Script> {
  const now = new Date().toISOString();
  const [row] = await getDb()
    .insert(scripts)
    .values({
      name: input.name.trim(),
      description: (input.description ?? '').trim(),
      platform: input.platform ?? 'window-cmd',
      actions: normalizeActions(input.actions),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return mapScript(row);
}

export async function updateScript(
  id: number,
  input: UpdateScriptInput,
): Promise<Script | null> {
  const now = new Date().toISOString();
  const [row] = await getDb()
    .update(scripts)
    .set({
      name: input.name.trim(),
      description: (input.description ?? '').trim(),
      platform: input.platform ?? 'window-cmd',
      actions: normalizeActions(input.actions),
      updatedAt: now,
    })
    .where(eq(scripts.id, id))
    .returning();

  return row ? mapScript(row) : null;
}

export async function deleteScript(id: number): Promise<boolean> {
  const deleted = await getDb().delete(scripts).where(eq(scripts.id, id)).returning();
  return deleted.length > 0;
}

export async function getActionVariables(
  scriptId: number,
  actionIndex: number,
): Promise<string[] | null> {
  const script = await getScriptById(scriptId);
  if (!script) {
    return null;
  }
  const action = script.actions[actionIndex];
  if (!action) {
    return null;
  }
  const { extractVariables } = await import('../utils/script-runner.js');
  return extractVariables(action.script);
}

export async function countScripts(): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(scripts);
  return row?.count ?? 0;
}
