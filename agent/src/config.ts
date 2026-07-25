export interface AgentConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
  zentaoMcpEnabled: boolean;
  bitbrowserMcpEnabled: boolean;
  bitbrowserMcpUrl: string;
  llmIoLogEnabled: boolean;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value === "1" || value.toLowerCase() === "true";
}

export function loadConfig(): AgentConfig {
  const zentaoMcpEnabled = parseBoolean(process.env.ZENTAO_MCP_ENABLED, false);
  const bitbrowserMcpEnabled = parseBoolean(
    process.env.BITBROWSER_MCP_ENABLED,
    true
  );

  return {
    // OpenAI 兼容接口（供 Agent 调用）
    baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:5000/v1",
    apiKey: process.env.OPENAI_API_KEY ?? "sk-autobrowser",
    model: process.env.OPENAI_MODEL ?? "qwen-plus",
    temperature: Number(process.env.OPENAI_TEMPERATURE ?? "0.2"),
    zentaoMcpEnabled,
    bitbrowserMcpEnabled,
    bitbrowserMcpUrl:
      process.env.BITBROWSER_MCP_URL ?? "http://127.0.0.1:54349/mcp",
    llmIoLogEnabled: parseBoolean(process.env.LLM_IO_LOG, true),
  };
}
