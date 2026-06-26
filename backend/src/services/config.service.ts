import { eq } from 'drizzle-orm';
import { getDb } from '../orm/client.js';
import { appConfig } from '../orm/schema/index.js';
import type { AppConfig } from '../types/index.js';
import { HttpError } from '../types/index.js';

let cache: AppConfig | null = null;

function mapConfig(row: typeof appConfig.$inferSelect): AppConfig {
  return {
    clipboard_monitoring: row.clipboardMonitoring,
    clipboard_max_length: row.clipboardMaxLength,
  };
}

export async function initConfigCache(): Promise<void> {
  cache = await loadConfigFromDb();
}

export function getConfig(): AppConfig {
  if (!cache) {
    throw new Error('Config cache 尚未初始化');
  }
  return { ...cache };
}

async function loadConfigFromDb(): Promise<AppConfig> {
  const [row] = await getDb().select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  if (!row) {
    return {
      clipboard_monitoring: false,
      clipboard_max_length: 1000,
    };
  }
  return mapConfig(row);
}

function validateUpdates(updates: Partial<AppConfig>): string[] {
  const errors: string[] = [];
  const current = cache ?? {
    clipboard_monitoring: false,
    clipboard_max_length: 1000,
  };

  if (updates.clipboard_monitoring !== undefined) {
    if (typeof updates.clipboard_monitoring !== 'boolean') {
      errors.push('clipboard_monitoring 必须为布尔值');
    }
  }

  if (updates.clipboard_max_length !== undefined) {
    const value = updates.clipboard_max_length;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      errors.push('clipboard_max_length 必须为大于 0 的整数');
    }
  }

  for (const key of Object.keys(updates) as Array<keyof AppConfig>) {
    if (!(key in current)) {
      errors.push(`未知配置项: ${key}`);
    }
  }

  return errors;
}

export async function setConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
  if (!cache) {
    throw new Error('Config cache 尚未初始化');
  }

  const errors = validateUpdates(updates);
  if (errors.length) {
    throw new HttpError(errors.join('; '), 400);
  }

  const next = { ...cache, ...updates };
  const [row] = await getDb()
    .update(appConfig)
    .set({
      clipboardMonitoring: next.clipboard_monitoring,
      clipboardMaxLength: next.clipboard_max_length,
    })
    .where(eq(appConfig.id, 1))
    .returning();

  cache = row ? mapConfig(row) : next;
  return { ...cache };
}

export async function getClipboardConfig(): Promise<Pick<AppConfig, 'clipboard_monitoring' | 'clipboard_max_length'>> {
  const config = getConfig();
  return {
    clipboard_monitoring: Boolean(config.clipboard_monitoring),
    clipboard_max_length: config.clipboard_max_length,
  };
}

export async function updateClipboardConfig(
  updates: Partial<Pick<AppConfig, 'clipboard_monitoring' | 'clipboard_max_length'>>,
): Promise<Pick<AppConfig, 'clipboard_monitoring' | 'clipboard_max_length'>> {
  const config = await setConfig(updates);
  return {
    clipboard_monitoring: Boolean(config.clipboard_monitoring),
    clipboard_max_length: config.clipboard_max_length,
  };
}
