import request from '@/utils/request';
import type { ApiResponse, AppConfig } from '@/types';

const BASE = '/settings/config';

export function fetchSettings(): Promise<AppConfig> {
  return request.get<unknown, ApiResponse<AppConfig>>(BASE).then((res) => res.data);
}

export function updateSettings(data: Partial<AppConfig>): Promise<AppConfig> {
  return request.put<unknown, ApiResponse<AppConfig>>(BASE, data).then((res) => res.data);
}

export function fetchDatabaseTables(): Promise<string[]> {
  return request.get<unknown, ApiResponse<string[]>>('/settings/tables').then((res) => res.data);
}

export function restoreFromBackup(): Promise<{ filePath: string }> {
  return request
    .post<unknown, ApiResponse<{ filePath: string }>>('/settings/restore')
    .then((res) => res.data);
}
