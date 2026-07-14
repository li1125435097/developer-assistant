import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..', '..');

export type DatabaseMode = 'pglite' | 'postgres';

function resolveDatabaseMode(): DatabaseMode {
  const mode = (process.env.DATABASE_MODE ?? 'pglite').toLowerCase();
  if (mode === 'postgres' || mode === 'postgresql') {
    return 'postgres';
  }
  return 'pglite';
}

/** Resolve env paths relative to project root so cwd / inherited env cannot drift. */
function resolveProjectPath(value: string | undefined, fallbackSegments: string[]): string {
  const fallback = path.join(projectRoot, ...fallbackSegments);
  if (!value) {
    return fallback;
  }
  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
}

const databaseMode = resolveDatabaseMode();

export const env = {
  port: Number(process.env.PORT) || 3000,
  database: {
    mode: databaseMode,
    /** PGlite 数据目录（仅 pglite 模式） */
    pgliteDir: resolveProjectPath(process.env.DATABASE_DIR, ['data', 'pglite']),
    /** 远程 PostgreSQL 连接串（仅 postgres 模式） */
    url: process.env.DATABASE_URL,
    /** 旧版 lowdb JSON 文件路径，用于首次迁移 */
    legacyJsonPath: resolveProjectPath(process.env.LEGACY_DATABASE_PATH, ['data', 'db.json']),
  },
  frontendDist: path.join(projectRoot, 'frontend', 'dist'),
  dataDir: resolveProjectPath(process.env.DATA_DIR, ['data']),
  backupDir: resolveProjectPath(process.env.BACKUP_DIR, ['data', 'db-bak']),
  logsDir: resolveProjectPath(process.env.LOGS_DIR, ['logs']),
  logsRetentionDays: Number(process.env.LOG_RETENTION_DAYS) || 7,
} as const;

export function assertDatabaseConfig(): void {
  if (env.database.mode === 'postgres' && !env.database.url) {
    throw new Error('postgres 模式需要设置 DATABASE_URL 环境变量');
  }
}
