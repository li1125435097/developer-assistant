export interface ScriptAction {
  action: string;
  script: string;
}

export interface Script {
  id: number;
  name: string;
  description: string;
  platform: string;
  actions: ScriptAction[];
  created_at: string;
  updated_at: string;
}

export interface ExecutionOutput {
  stdout: string;
  stderr: string;
}

export interface Execution {
  id: number;
  script_id: number;
  script_name: string;
  action: string;
  action_index: number;
  command: string;
  variables: Record<string, string>;
  success: boolean;
  output: ExecutionOutput | string;
  created_at: string;
}

export interface AppConfig {
  clipboard_monitoring: boolean;
  clipboard_max_length: number;
  close_to_tray_on_close: boolean;
}

export interface ClipboardRecord {
  id: number;
  content: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  records: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateScriptInput {
  name: string;
  description?: string;
  platform?: string;
  actions: ScriptAction[];
}

export interface UpdateScriptInput extends CreateScriptInput {}

export interface CreateExecutionInput {
  script_id: number;
  script_name: string;
  action: string;
  action_index: number;
  command: string;
  variables: Record<string, string>;
  success: boolean;
  output: ExecutionOutput | string;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
