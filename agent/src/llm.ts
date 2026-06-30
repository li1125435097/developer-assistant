import { ChatOllama } from "@langchain/ollama";
import { loadConfig, type AgentConfig } from "./config.js";
import { createLlmIoCallbackHandler } from "./logging/llmIoLogger.js";

export function createOllamaLLM(overrides: Partial<AgentConfig> = {}): ChatOllama {
  const config = { ...loadConfig(), ...overrides };

  return new ChatOllama({
    baseUrl: config.ollamaBaseUrl,
    model: config.model,
    temperature: config.temperature,
    numCtx: config.ollamaNumCtx,
    maxRetries: 2,
    callbacks: config.llmIoLogEnabled ? [createLlmIoCallbackHandler()] : undefined,
  });
}
