import request from '@/utils/request';
import type {
  ApiResponse,
  ExecuteResult,
  Script,
  ScriptPayload,
} from '@/types';

const BASE = '/scripts';

export function fetchScripts(): Promise<Script[]> {
  return request.get<unknown, ApiResponse<Script[]>>(BASE).then((res) => res.data);
}

export function fetchScript(id: number): Promise<Script> {
  return request.get<unknown, ApiResponse<Script>>(`${BASE}/${id}`).then((res) => res.data);
}

export function createScript(data: ScriptPayload): Promise<void> {
  return request.post(BASE, data);
}

export function updateScript(id: number, data: ScriptPayload): Promise<void> {
  return request.put(`${BASE}/${id}`, data);
}

export function deleteScript(id: number): Promise<void> {
  return request.delete(`${BASE}/${id}`);
}

export function fetchActionVariables(scriptId: number, actionIndex: number): Promise<string[]> {
  return request
    .get<unknown, ApiResponse<string[]>>(`${BASE}/${scriptId}/actions/${actionIndex}/variables`)
    .then((res) => res.data);
}

export function executeScript(
  scriptId: number,
  actionIndex: number,
  variables: Record<string, string>,
): Promise<ExecuteResult> {
  return request.post(`${BASE}/${scriptId}/execute`, { actionIndex, variables });
}
