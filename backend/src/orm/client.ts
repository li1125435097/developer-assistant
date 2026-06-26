import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import { schema, type Schema } from './schema/index.js';

export type Database = PgliteDatabase<Schema> | PostgresJsDatabase<Schema>;

let db: Database | null = null;
let pgliteClient: PGlite | null = null;
let postgresClient: ReturnType<typeof postgres> | null = null;

export function getDb(): Database {
  if (!db) {
    throw new Error('数据库尚未初始化，请先调用 initDatabase()');
  }
  return db;
}

export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  if (env.database.mode === 'postgres') {
    if (!env.database.url) {
      throw new Error('postgres 模式需要设置 DATABASE_URL');
    }
    postgresClient = postgres(env.database.url, { max: 10 });
    db = drizzlePostgres(postgresClient, { schema });
    return db;
  }

  fs.mkdirSync(env.database.pgliteDir, { recursive: true });
  pgliteClient = new PGlite(env.database.pgliteDir);
  db = drizzlePglite({ client: pgliteClient, schema });
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (pgliteClient) {
    await pgliteClient.close();
    pgliteClient = null;
  }
  if (postgresClient) {
    await postgresClient.end({ timeout: 5 });
    postgresClient = null;
  }
  db = null;
}

export function getDatabaseMode() {
  return env.database.mode;
}

export function getPgliteDir() {
  return env.database.pgliteDir;
}

export function getLegacyJsonPath() {
  return env.database.legacyJsonPath;
}
