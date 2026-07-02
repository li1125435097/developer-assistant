export type Platform =
  | 'window-cmd'
  | 'window-powershell'
  | 'linux'
  | 'mac'
  | 'all'
  | 'window';

export interface ScriptAction {
  action: string;
  script: string;
}

export interface Script {
  id: number;
  name: string;
  description?: string;
  platform: Platform;
  actions: ScriptAction[];
}

export interface ScriptPayload {
  name: string;
  description: string;
  platform: Platform;
  actions: ScriptAction[];
}

export interface ExecutionOutput {
  stdout?: string;
  stderr?: string;
}

export interface ExecuteResult {
  success: boolean;
  data?: ExecutionOutput | string;
  error?: string;
}

export interface HistoryRecord {
  id: number;
  created_at: string;
  script_name?: string;
  action?: string;
  success: boolean;
  command?: string;
  variables?: Record<string, string>;
  output?: ExecutionOutput | string;
}

export interface ClipboardRecord {
  id: number;
  created_at: string;
  content: string;
}

export interface ClipboardListResult {
  records: ClipboardRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AppConfig {
  clipboard_monitoring?: boolean;
  clipboard_max_length?: number;
  close_to_tray_on_close?: boolean;
  [key: string]: boolean | number | string | undefined;
}

export interface ApiResponse<T> {
  data: T;
}

export type MessageType = 'success' | 'error' | 'warning' | 'info' | 'danger';

export type ThemeMode = 'light' | 'dark' | 'auto';
