import fs from 'node:fs';
import { sql } from 'drizzle-orm';
import { getDb, getLegacyJsonPath, initDatabase } from './client.js';
import { appConfig, clipboardRecords, executions, scripts } from './schema/index.js';

const MIGRATIONS_TABLE = 'schema_migrations';

const INITIAL_MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS scripts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT 'window-cmd',
    actions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS executions (
    id SERIAL PRIMARY KEY,
    script_id INTEGER NOT NULL,
    script_name TEXT NOT NULL,
    action TEXT NOT NULL,
    action_index INTEGER NOT NULL,
    command TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '{}',
    success BOOLEAN NOT NULL,
    output JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS app_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    clipboard_monitoring BOOLEAN NOT NULL DEFAULT FALSE,
    clipboard_max_length INTEGER NOT NULL DEFAULT 1000,
    CONSTRAINT app_config_singleton CHECK (id = 1)
  )`,
  `CREATE TABLE IF NOT EXISTS clipboard_records (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_clipboard_records_created_at ON clipboard_records (created_at DESC)`,
];

interface LegacyDbJson {
  scripts?: Array<{
    id: number;
    name: string;
    description?: string;
    platform?: string;
    actions: Array<{ action: string; script: string }>;
    created_at?: string;
    updated_at?: string;
  }>;
  executions?: Array<{
    id: number;
    script_id: number;
    script_name: string;
    action: string;
    action_index: number;
    command: string;
    variables?: Record<string, string>;
    success: boolean;
    output: unknown;
    created_at?: string;
  }>;
  config?: {
    clipboard_monitoring?: boolean;
    clipboard_max_length?: number;
  };
  clipboard_records?: Array<{
    id: number;
    content: string;
    created_at?: string;
  }>;
}

function getExecuteRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    return (result as { rows: T[] }).rows ?? [];
  }
  return [];
}

async function hasMigration(name: string): Promise<boolean> {
  const database = getDb();
  const result = await database.execute(
    sql`SELECT 1 AS found FROM schema_migrations WHERE name = ${name} LIMIT 1`,
  );
  return getExecuteRows(result).length > 0;
}

async function markMigration(name: string): Promise<void> {
  const database = getDb();
  await database.execute(sql`
    INSERT INTO schema_migrations (name) VALUES (${name})
    ON CONFLICT (name) DO NOTHING
  `);
}

async function executeStatements(statements: string[]): Promise<void> {
  const database = getDb();
  for (const statement of statements) {
    await database.execute(sql.raw(statement));
  }
}

async function runInitialMigration(): Promise<void> {
  await executeStatements(INITIAL_MIGRATION_STATEMENTS);
  await markMigration('0001_initial');
}

async function importLegacyJsonIfNeeded(): Promise<void> {
  if (await hasMigration('0002_legacy_json_import')) {
    return;
  }

  const legacyPath = getLegacyJsonPath();
  if (!fs.existsSync(legacyPath)) {
    await markMigration('0002_legacy_json_import');
    return;
  }

  const database = getDb();
  const [scriptCount] = await database.select({ count: sql<number>`count(*)::int` }).from(scripts);
  if ((scriptCount?.count ?? 0) > 0) {
    await markMigration('0002_legacy_json_import');
    return;
  }

  const raw = fs.readFileSync(legacyPath, 'utf-8');
  const legacy = JSON.parse(raw) as LegacyDbJson;

  if (legacy.scripts?.length) {
    for (const item of legacy.scripts) {
      await database.insert(scripts).values({
        id: item.id,
        name: item.name,
        description: item.description ?? '',
        platform: item.platform ?? 'window-cmd',
        actions: item.actions,
        createdAt: item.created_at ?? new Date().toISOString(),
        updatedAt: item.updated_at ?? new Date().toISOString(),
      });
    }
    await database.execute(sql`
      SELECT setval(pg_get_serial_sequence('scripts', 'id'), COALESCE((SELECT MAX(id) FROM scripts), 1))
    `);
  }

  if (legacy.executions?.length) {
    for (const item of legacy.executions) {
      await database.insert(executions).values({
        id: item.id,
        scriptId: item.script_id,
        scriptName: item.script_name,
        action: item.action,
        actionIndex: item.action_index,
        command: item.command,
        variables: item.variables ?? {},
        success: item.success,
        output: item.output as never,
        createdAt: item.created_at ?? new Date().toISOString(),
      });
    }
    await database.execute(sql`
      SELECT setval(pg_get_serial_sequence('executions', 'id'), COALESCE((SELECT MAX(id) FROM executions), 1))
    `);
  }

  if (legacy.clipboard_records?.length) {
    for (const item of legacy.clipboard_records) {
      await database.insert(clipboardRecords).values({
        id: item.id,
        content: item.content,
        createdAt: item.created_at ?? new Date().toISOString(),
      });
    }
    await database.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('clipboard_records', 'id'),
        COALESCE((SELECT MAX(id) FROM clipboard_records), 1)
      )
    `);
  }

  const config = legacy.config ?? {};
  await database
    .insert(appConfig)
    .values({
      id: 1,
      clipboardMonitoring: Boolean(config.clipboard_monitoring),
      clipboardMaxLength:
        typeof config.clipboard_max_length === 'number' && config.clipboard_max_length > 0
          ? config.clipboard_max_length
          : 1000,
    })
    .onConflictDoNothing();

  await markMigration('0002_legacy_json_import');
}

async function ensureDefaultConfig(): Promise<void> {
  const database = getDb();
  await database
    .insert(appConfig)
    .values({
      id: 1,
      clipboardMonitoring: false,
      clipboardMaxLength: 1000,
    })
    .onConflictDoNothing();
}

export async function runMigrations(): Promise<void> {
  await initDatabase();

  const database = getDb();
  await database.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `));

  if (!(await hasMigration('0001_initial'))) {
    await runInitialMigration();
  }

  await importLegacyJsonIfNeeded();
  await ensureDefaultConfig();
}
