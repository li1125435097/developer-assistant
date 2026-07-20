import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { getDb } from '../orm/client.js';
import { getConfig } from './config.service.js';

const BACKUP_INTERVAL_MS = 60 * 60 * 1000;
const MAX_BACKUP_FILES = 10;
const TABLE_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/i;

let backupTimer: ReturnType<typeof setInterval> | null = null;

interface QueryRow {
  [key: string]: unknown;
}

interface TableColumnRow {
  column_name: string;
  data_type: string;
  udt_name: string;
  character_maximum_length: number | null;
  is_nullable: string;
  column_default: string | null;
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

function assertValidTableName(tableName: string): void {
  if (!TABLE_NAME_PATTERN.test(tableName)) {
    throw new Error(`无效的表名: ${tableName}`);
  }
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function formatSqlString(value: string): string {
  const needsEscapeSyntax = /[\n\r\t\\]/.test(value);
  if (!needsEscapeSyntax) {
    return `'${escapeSqlString(value)}'`;
  }
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `E'${escaped}'`;
}

function isJsonbColumn(column: TableColumnRow): boolean {
  return column.data_type === 'jsonb' || column.udt_name === 'jsonb';
}

function formatColumnValue(column: TableColumnRow, value: unknown): string {
  if (isJsonbColumn(column)) {
    return formatSqlString(JSON.stringify(value));
  }
  return formatSqlValue(value);
}

function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }
  if (value instanceof Date) {
    return formatSqlString(value.toISOString());
  }
  if (typeof value === 'object') {
    return formatSqlString(JSON.stringify(value));
  }
  return formatSqlString(String(value));
}

function formatColumnType(column: TableColumnRow): string {
  if (column.column_default?.startsWith('nextval(') && column.data_type === 'integer') {
    return 'SERIAL';
  }

  if (column.data_type === 'character varying' && column.character_maximum_length) {
    return `VARCHAR(${column.character_maximum_length})`;
  }

  if (column.data_type === 'USER-DEFINED') {
    return column.udt_name.toUpperCase();
  }

  return column.data_type.toUpperCase();
}

function buildCreateTableSql(tableName: string, columns: TableColumnRow[]): string {
  const columnDefs = columns.map((column) => {
    let definition = `${column.column_name} ${formatColumnType(column)}`;
    if (column.is_nullable === 'NO') {
      definition += ' NOT NULL';
    }
    if (column.column_default && !column.column_default.startsWith('nextval(')) {
      definition += ` DEFAULT ${column.column_default}`;
    }
    return definition;
  });

  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columnDefs.join(',\n  ')}\n);`;
}

async function getTableColumns(tableName: string): Promise<TableColumnRow[]> {
  assertValidTableName(tableName);
  const database = getDb();
  const result = await database.execute(sql`
    SELECT
      column_name,
      data_type,
      udt_name,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
    ORDER BY ordinal_position
  `);
  return getExecuteRows<TableColumnRow>(result);
}

async function exportTableSql(tableName: string): Promise<string> {
  assertValidTableName(tableName);
  const columns = await getTableColumns(tableName);
  if (!columns.length) {
    throw new Error(`表不存在: ${tableName}`);
  }

  const database = getDb();
  const result = await database.execute(sql.raw(`SELECT * FROM ${tableName}`));
  const rows = getExecuteRows<QueryRow>(result);

  const lines: string[] = [
    `-- Table: ${tableName}`,
    buildCreateTableSql(tableName, columns),
    '',
  ];

  if (!rows.length) {
    lines.push(`-- No data for ${tableName}`);
    lines.push('');
    return lines.join('\n');
  }

  const columnNames = columns.map((column) => column.column_name);
  for (const row of rows) {
    const values = columns.map((column) => formatColumnValue(column, row[column.column_name]));
    lines.push(
      `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function formatBackupFileName(date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, '-');
  return `backup-${stamp}.sql`;
}

function toDayKey(ms: number): string {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function pruneOldBackups(): void {
  if (!fs.existsSync(env.backupDir)) {
    return;
  }

  const backupFiles = fs.readdirSync(env.backupDir)
    .filter((name) => name.startsWith('backup-') && name.endsWith('.sql'))
    .map((name) => {
      const filePath = path.join(env.backupDir, name);
      const mtime = fs.statSync(filePath).mtimeMs;
      return { filePath, mtime, dayKey: toDayKey(mtime) };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const latestByDay = new Map<string, typeof backupFiles[number]>();
  const filesToDelete = new Set<string>();

  for (const file of backupFiles) {
    if (!latestByDay.has(file.dayKey)) {
      latestByDay.set(file.dayKey, file);
    } else {
      filesToDelete.add(file.filePath);
    }
  }

  const keptFiles = [...latestByDay.values()].sort((a, b) => b.mtime - a.mtime);
  for (const file of keptFiles.slice(MAX_BACKUP_FILES)) {
    filesToDelete.add(file.filePath);
  }

  for (const filePath of filesToDelete) {
    fs.unlinkSync(filePath);
  }
}

export async function listDatabaseTables(): Promise<string[]> {
  const database = getDb();
  const result = await database.execute(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
    ORDER BY tablename
  `);
  return getExecuteRows<{ tablename: string }>(result).map((row) => row.tablename).filter((name) => name !== 'schema_migrations');
}

export async function backupTables(tableNames: string[]): Promise<string | null> {
  const uniqueTables = [...new Set(tableNames.filter(Boolean))];
  if (!uniqueTables.length) {
    return null;
  }

  const availableTables = new Set(await listDatabaseTables());
  const selectedTables = uniqueTables.filter((tableName) => {
    assertValidTableName(tableName);
    return availableTables.has(tableName);
  });

  if (!selectedTables.length) {
    return null;
  }

  fs.mkdirSync(env.backupDir, { recursive: true });

  const sections: string[] = [
    '-- Database backup generated by developer-assistant',
    `-- Timestamp: ${new Date().toISOString()}`,
    `-- Tables: ${selectedTables.join(', ')}`,
    '',
  ];

  for (const tableName of selectedTables) {
    sections.push(await exportTableSql(tableName));
  }

  const filePath = path.join(env.backupDir, formatBackupFileName());
  fs.writeFileSync(filePath, sections.join('\n'), 'utf8');
  pruneOldBackups();
  return filePath;
}

export async function runScheduledBackup(): Promise<string | null> {
  const { backup_tables } = getConfig();
  if (!backup_tables.length) {
    return null;
  }
  return backupTables(backup_tables);
}

export function startBackupScheduler(): void {
  if (backupTimer) {
    return;
  }

  backupTimer = setInterval(() => {
    void runScheduledBackup().catch((error) => {
      console.error('定时数据库备份失败:', error);
    });
  }, BACKUP_INTERVAL_MS);

  void runScheduledBackup().catch((error) => {
    console.error('启动时数据库备份失败:', error);
  });
}

export function stopBackupScheduler(): void {
  if (!backupTimer) {
    return;
  }
  clearInterval(backupTimer);
  backupTimer = null;
}

export function getLatestBackupFile(): string | null {
  if (!fs.existsSync(env.backupDir)) {
    return null;
  }

  const backupFiles = fs.readdirSync(env.backupDir)
    .filter((name) => name.startsWith('backup-') && name.endsWith('.sql'))
    .map((name) => {
      const filePath = path.join(env.backupDir, name);
      return { filePath, mtime: fs.statSync(filePath).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return backupFiles[0]?.filePath ?? null;
}

function parseSqlStatements(content: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let escapeString = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (!inString && char === '-' && content[i + 1] === '-') {
      i += 2;
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      continue;
    }

    if (char === "'") {
      if (inString) {
        current += char;
        if (content[i + 1] === "'") {
          current += content[i + 1];
          i += 1;
          continue;
        }
        inString = false;
        escapeString = false;
        continue;
      }
      escapeString = current.endsWith('E');
      inString = true;
      current += char;
      continue;
    }

    if (inString && escapeString && char === '\\') {
      current += char;
      if (i + 1 < content.length) {
        current += content[i + 1];
        i += 1;
      }
      continue;
    }

    current += char;

    if (char === ';' && !inString) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
    }
  }

  const remaining = current.trim();
  if (remaining) {
    statements.push(remaining);
  }

  return statements;
}

const INSERT_STATEMENT_PATTERN = /^INSERT INTO ([a-z_][a-z0-9_]*) \(([^)]+)\) VALUES \(([\s\S]+)\);?$/i;
const tableColumnCache = new Map<string, TableColumnRow[]>();

function decodeSqlString(literal: string): string {
  const trimmed = literal.trim();
  let escapeSyntax = false;
  let source = trimmed;

  if (source.startsWith("E'") && source.endsWith("'")) {
    escapeSyntax = true;
    source = source.slice(2, -1);
  } else if (source.startsWith("'") && source.endsWith("'")) {
    source = source.slice(1, -1);
  } else {
    return trimmed;
  }

  let result = '';
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "'") {
      if (source[i + 1] === "'") {
        result += "'";
        i += 1;
        continue;
      }
      result += "'";
      continue;
    }
    if (escapeSyntax && char === '\\' && i + 1 < source.length) {
      const next = source[i + 1];
      if (next === 'n') {
        result += '\n';
      } else if (next === 'r') {
        result += '\r';
      } else if (next === 't') {
        result += '\t';
      } else if (next === '\\') {
        result += '\\';
      } else {
        result += next;
      }
      i += 1;
      continue;
    }
    result += char;
  }
  return result;
}

function parseSqlValueList(source: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let escapeString = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (char === "'") {
      if (inString) {
        current += char;
        if (source[i + 1] === "'") {
          current += source[i + 1];
          i += 1;
          continue;
        }
        inString = false;
        escapeString = false;
        continue;
      }
      escapeString = current.trimEnd().endsWith('E');
      inString = true;
      current += char;
      continue;
    }

    if (inString && escapeString && char === '\\') {
      current += char;
      if (i + 1 < source.length) {
        current += source[i + 1];
        i += 1;
      }
      continue;
    }

    if (char === ',' && !inString) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
}

function isValidJsonText(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function repairJsonbInsertValues(
  columns: string[],
  values: string[],
  columnMeta: Map<string, TableColumnRow>,
): string[] {
  return values.map((rawValue, index) => {
    const column = columnMeta.get(columns[index] ?? '');
    if (!column || !isJsonbColumn(column)) {
      return rawValue;
    }

    const trimmed = rawValue.trim();
    if (!trimmed.startsWith("'")) {
      return rawValue;
    }

    const decoded = decodeSqlString(trimmed);
    if (isValidJsonText(decoded)) {
      return rawValue;
    }

    return formatSqlString(JSON.stringify(decoded));
  });
}

async function getTableColumnsCached(tableName: string): Promise<TableColumnRow[]> {
  if (!tableColumnCache.has(tableName)) {
    tableColumnCache.set(tableName, await getTableColumns(tableName));
  }
  return tableColumnCache.get(tableName) ?? [];
}

async function repairInsertStatement(statement: string): Promise<string | null> {
  const match = statement.match(INSERT_STATEMENT_PATTERN);
  if (!match) {
    return null;
  }

  const tableName = match[1];
  assertValidTableName(tableName);
  const columns = match[2].split(',').map((column) => column.trim());
  const values = parseSqlValueList(match[3]);
  if (values.length !== columns.length) {
    return null;
  }

  const columnRows = await getTableColumnsCached(tableName);
  const columnMeta = new Map(columnRows.map((column) => [column.column_name, column]));
  const repairedValues = repairJsonbInsertValues(columns, values, columnMeta);
  const changed = repairedValues.some((value, index) => value !== values[index]);
  if (!changed) {
    return null;
  }

  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${repairedValues.join(', ')})`;
}

/**
 * After INSERT with explicit ids (e.g. backup restore), SERIAL sequences stay
 * behind MAX(id) and the next default insert hits a PK conflict. Sync them.
 */
export async function syncSerialSequences(): Promise<void> {
  const database = getDb();
  const result = await database.execute(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_default LIKE 'nextval(%'
    ORDER BY table_name, column_name
  `);

  const sequences = getExecuteRows<{ table_name: string; column_name: string }>(result);
  for (const { table_name: tableName, column_name: columnName } of sequences) {
    assertValidTableName(tableName);
    if (!TABLE_NAME_PATTERN.test(columnName)) {
      continue;
    }
    await database.execute(sql.raw(`
      SELECT setval(
        pg_get_serial_sequence('${tableName}', '${columnName}'),
        COALESCE((SELECT MAX(${columnName}) FROM ${tableName}), 1),
        (SELECT MAX(${columnName}) FROM ${tableName}) IS NOT NULL
      )
    `));
  }
}

export async function importSqlFile(filePath: string, strict = false): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf8');
  const statements = parseSqlStatements(content);
  const database = getDb();
  tableColumnCache.clear();

  for (const statement of statements) {
    try {
      const repaired = await repairInsertStatement(statement);
      await database.execute(sql.raw(repaired ?? statement));
    } catch (error) {
      if (strict) {
        throw error;
      }
      console.warn('导入 SQL 语句失败，已跳过:', statement.slice(0, 120), error);
    }
  }

  await syncSerialSequences();
}

const SYSTEM_TABLES = new Set(['schema_migrations']);

async function clearAllTableData(): Promise<void> {
  const tables = (await listDatabaseTables()).filter((name) => !SYSTEM_TABLES.has(name));
  if (!tables.length) {
    return;
  }

  const database = getDb();
  const tableList = tables.join(', ');
  await database.execute(sql.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`));
}

export async function restoreFromBackup(): Promise<string> {
  const latestBackup = getLatestBackupFile();
  if (!latestBackup) {
    throw new Error('未找到可用备份文件');
  }

  await clearAllTableData();
  await importSqlFile(latestBackup, true);
  return latestBackup;
}
