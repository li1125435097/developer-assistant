import request from '@/utils/request';
import type {
  ApiResponse,
  NotebookListResult,
  NotebookNote,
  NotebookNotePayload,
  NotebookTag,
} from '@/types';

const BASE = '/notebooks';

export function fetchNotebookNotes(
  page: number,
  pageSize: number,
  q = '',
  tag = '',
): Promise<NotebookListResult> {
  return request
    .get<unknown, ApiResponse<NotebookListResult>>(BASE, {
      params: { page, pageSize, q: q || undefined, tag: tag || undefined },
    })
    .then((res) => res.data);
}

export function fetchNotebookNote(id: number): Promise<NotebookNote> {
  return request.get<unknown, ApiResponse<NotebookNote>>(`${BASE}/${id}`).then((res) => res.data);
}

export function createNotebookNote(data: NotebookNotePayload): Promise<NotebookNote> {
  return request.post<unknown, ApiResponse<NotebookNote>>(BASE, data).then((res) => res.data);
}

export function updateNotebookNote(id: number, data: NotebookNotePayload): Promise<NotebookNote> {
  return request.put<unknown, ApiResponse<NotebookNote>>(`${BASE}/${id}`, data).then((res) => res.data);
}

export function deleteNotebookNote(id: number): Promise<void> {
  return request.delete(`${BASE}/${id}`);
}

export function toggleNotebookPin(id: number): Promise<NotebookNote> {
  return request.put<unknown, ApiResponse<NotebookNote>>(`${BASE}/${id}/pin`).then((res) => res.data);
}

export function fetchNotebookTags(q = ''): Promise<NotebookTag[]> {
  return request
    .get<unknown, ApiResponse<NotebookTag[]>>(`${BASE}/tags`, { params: { q: q || undefined } })
    .then((res) => res.data);
}
