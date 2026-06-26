import { desc, eq } from 'drizzle-orm';
import { getDb } from '../orm/client.js';
import { executions } from '../orm/schema/index.js';
import type { CreateExecutionInput, Execution, ExecutionOutput } from '../types/index.js';

function mapExecution(row: typeof executions.$inferSelect): Execution {
  return {
    id: row.id,
    script_id: row.scriptId,
    script_name: row.scriptName,
    action: row.action,
    action_index: row.actionIndex,
    command: row.command,
    variables: row.variables,
    success: row.success,
    output: row.output,
    created_at: row.createdAt,
  };
}

export async function listExecutions(): Promise<Execution[]> {
  const rows = await getDb().select().from(executions).orderBy(desc(executions.id));
  return rows.map(mapExecution);
}

export async function getExecutionById(id: number): Promise<Execution | null> {
  const [row] = await getDb()
    .select()
    .from(executions)
    .where(eq(executions.id, id))
    .limit(1);
  return row ? mapExecution(row) : null;
}

export async function createExecution(input: CreateExecutionInput): Promise<Execution> {
  const [row] = await getDb()
    .insert(executions)
    .values({
      scriptId: input.script_id,
      scriptName: input.script_name,
      action: input.action,
      actionIndex: input.action_index,
      command: input.command,
      variables: input.variables,
      success: input.success,
      output: input.output,
    })
    .returning();

  return mapExecution(row);
}

export async function deleteExecution(id: number): Promise<boolean> {
  const deleted = await getDb().delete(executions).where(eq(executions.id, id)).returning();
  return deleted.length > 0;
}

export async function clearExecutions(): Promise<void> {
  await getDb().delete(executions);
}

export type { ExecutionOutput };
