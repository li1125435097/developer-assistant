import request from '@/utils/request';
import type { ApiResponse, HistoryRecord } from '@/types';

const BASE = '/history';

export function fetchHistory(): Promise<HistoryRecord[]> {
  return request.get<unknown, ApiResponse<HistoryRecord[]>>(BASE).then((res) => res.data);
}

export function fetchHistoryRecord(id: number): Promise<HistoryRecord> {
  return request.get<unknown, ApiResponse<HistoryRecord>>(`${BASE}/${id}`).then((res) => res.data);
}

export function deleteHistoryRecord(id: number): Promise<void> {
  return request.delete(`${BASE}/${id}`);
}

export function clearHistory(): Promise<void> {
  return request.delete(BASE);
}
