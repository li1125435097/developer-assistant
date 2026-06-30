export interface AgentConfig {
  ollamaBaseUrl: string;
  model: string;
  temperature: number;
  zentaoMcpEnabled: boolean;
  ollamaNumCtx: number;
  llmIoLogEnabled: boolean;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value === "1" || value.toLowerCase() === "true";
}

export function loadConfig(): AgentConfig {
  const zentaoMcpEnabled = parseBoolean(process.env.ZENTAO_MCP_ENABLED, true);

  return {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
    model: process.env.OLLAMA_MODEL ?? "llama3.2",
    temperature: Number(process.env.OLLAMA_TEMPERATURE ?? "0.2"),
    zentaoMcpEnabled,
    // Skill 分层按需加载 MCP 工具，默认上下文可低于全量挂载 MCP 时
    ollamaNumCtx: Number(process.env.OLLAMA_NUM_CTX ?? "8192"),
    llmIoLogEnabled: parseBoolean(process.env.LLM_IO_LOG, true),
  };
}
