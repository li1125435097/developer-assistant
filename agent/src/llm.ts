import { ChatOpenAI } from "@langchain/openai";
import { loadConfig, type AgentConfig } from "./config.js";
import { createLlmIoCallbackHandler } from "./logging/llmIoLogger.js";

export function createLLM(overrides: Partial<AgentConfig> = {}): ChatOpenAI {
  const config = { ...loadConfig(), ...overrides };

  return new ChatOpenAI({
    model: config.model,
    temperature: config.temperature,
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseURL,
    },
    maxRetries: 2,
    callbacks: config.llmIoLogEnabled ? [createLlmIoCallbackHandler()] : undefined,
  });
}

/** @deprecated Use createLLM */
export const createOllamaLLM = createLLM;
