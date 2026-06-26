import request from '@/utils/request';
import type {
  ApiResponse,
  AppConfig,
  ClipboardListResult,
  ClipboardRecord,
} from '@/types';

const BASE = '/clipboard';

export function fetchClipboardConfig(): Promise<AppConfig> {
  return request.get<unknown, ApiResponse<AppConfig>>(`${BASE}/config`).then((res) => res.data);
}

export function updateClipboardConfig(data: Partial<AppConfig>): Promise<AppConfig> {
  return request.put<unknown, ApiResponse<AppConfig>>(`${BASE}/config`, data).then((res) => res.data);
}

export function fetchClipboardRecords(page: number, pageSize: number): Promise<ClipboardListResult> {
  return request
    .get<unknown, ApiResponse<ClipboardListResult>>(BASE, { params: { page, pageSize } })
    .then((res) => res.data);
}

export function fetchClipboardRecord(id: number): Promise<ClipboardRecord> {
  return request.get<unknown, ApiResponse<ClipboardRecord>>(`${BASE}/${id}`).then((res) => res.data);
}

export function deleteClipboardRecord(id: number): Promise<void> {
  return request.delete(`${BASE}/${id}`);
}

export function clearClipboardRecords(): Promise<void> {
  return request.delete(BASE);
}
