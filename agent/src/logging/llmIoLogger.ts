import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import type { ChatGeneration, LLMResult } from "@langchain/core/outputs";

let llmCallCounter = 0;

interface InputCharStats {
  messagesChars: number;
  toolsChars: number;
  toolCount: number;
  promptsChars: number;
  totalChars: number;
}

interface OutputCharStats {
  contentChars: number;
  toolCallsChars: number;
  totalChars: number;
  formattedChars: number;
}

const ANSI_BLUE = "\x1b[34m";
const ANSI_GREEN = "\x1b[32m";
const ANSI_RESET = "\x1b[0m";

function formatTimestamp(date = new Date()): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function colorize(text: string, color: string): string {
  return `${color}${text}${ANSI_RESET}`;
}

function logInput(message: string): void {
  console.log(colorize(message, ANSI_BLUE));
}

function logOutput(message: string): void {
  console.log(colorize(message, ANSI_GREEN));
}

function formatContent(content: BaseMessage["content"]): string {
  if (typeof content === "string") {
    return content || "(empty)";
  }

  if (Array.isArray(content)) {
    const text = content
      .map((block) => {
        if (typeof block === "string") {
          return block;
        }

        if (block && typeof block === "object" && "text" in block && typeof block.text === "string") {
          return block.text;
        }

        return JSON.stringify(block);
      })
      .filter(Boolean)
      .join("\n");

    return text || JSON.stringify(content, null, 2);
  }

  return JSON.stringify(content, null, 2);
}

function formatMessage(message: BaseMessage, index: number): string {
  const lines = [`[${index + 1}] ${message.getType()}: ${formatContent(message.content)}`];

  if (AIMessage.isInstance(message) && message.tool_calls?.length) {
    lines.push(`  tool_calls: ${JSON.stringify(message.tool_calls, null, 2)}`);
  }

  return lines.join("\n");
}

function formatMessages(messages: BaseMessage[]): string {
  return messages.map((message, index) => formatMessage(message, index)).join("\n\n");
}

function extractTools(extraParams?: Record<string, unknown>): unknown[] | undefined {
  const invocationParams = extraParams?.invocation_params;
  const invocationTools =
    invocationParams &&
    typeof invocationParams === "object" &&
    "tools" in invocationParams
      ? invocationParams.tools
      : undefined;

  if (Array.isArray(invocationTools)) {
    return invocationTools;
  }

  const options = extraParams?.options;
  const optionTools =
    options && typeof options === "object" && "tools" in options
      ? options.tools
      : undefined;

  return Array.isArray(optionTools) ? optionTools : undefined;
}

function measureMessagesChars(messages: BaseMessage[]): number {
  return formatMessages(messages).length;
}

function measureInputCharStats(
  messageBatches: BaseMessage[][],
  extraParams?: Record<string, unknown>,
  prompts?: string[]
): InputCharStats {
  const messagesChars = messageBatches.reduce(
    (total, messages) => total + measureMessagesChars(messages),
    0
  );
  const promptsChars = prompts?.reduce((total, prompt) => total + prompt.length, 0) ?? 0;
  const tools = extractTools(extraParams);
  
  const toolsChars = tools ? JSON.stringify(tools).length : 0;

  return {
    messagesChars,
    toolsChars,
    toolCount: tools?.length ?? 0,
    promptsChars,
    totalChars: messagesChars + promptsChars + toolsChars,
  };
}

function formatInputCharStats(stats: InputCharStats): string {
  const parts = [`messages: ${stats.messagesChars}`];

  if (stats.promptsChars > 0) {
    parts.push(`prompts: ${stats.promptsChars}`);
  }

  if (stats.toolCount > 0) {
    parts.push(`tools: ${stats.toolsChars} (${stats.toolCount} tools)`);
  }

  parts.push(`total: ${stats.totalChars}`);

  return `[chars] ${parts.join(" | ")}`;
}

function measureOutputCharStats(output: LLMResult): OutputCharStats {
  let contentChars = 0;
  let toolCallsChars = 0;

  for (const batch of output.generations) {
    for (const generation of batch) {
      const chatGeneration = generation as ChatGeneration;

      if (chatGeneration.message) {
        contentChars += formatContent(chatGeneration.message.content).length;

        if (AIMessage.isInstance(chatGeneration.message) && chatGeneration.message.tool_calls?.length) {
          toolCallsChars += JSON.stringify(chatGeneration.message.tool_calls).length;
        }

        continue;
      }

      contentChars += generation.text.length;
    }
  }

  const formatted = formatLlmOutput(output);

  return {
    contentChars,
    toolCallsChars,
    totalChars: contentChars + toolCallsChars,
    formattedChars: formatted.length,
  };
}

function formatOutputCharStats(stats: OutputCharStats): string {
  const parts = [`content: ${stats.contentChars}`];

  if (stats.toolCallsChars > 0) {
    parts.push(`tool_calls: ${stats.toolCallsChars}`);
  }

  parts.push(`total: ${stats.totalChars}`);
  parts.push(`formatted: ${stats.formattedChars}`);

  return `[chars] ${parts.join(" | ")}`;
}

function formatLlmOutput(output: LLMResult): string {
  const parts: string[] = [];

  for (const [batchIndex, batch] of output.generations.entries()) {
    for (const [genIndex, generation] of batch.entries()) {
      const chatGeneration = generation as ChatGeneration;

      if (chatGeneration.message) {
        parts.push(formatMessage(chatGeneration.message, batchIndex * batch.length + genIndex));
        continue;
      }

      parts.push(`[${batchIndex + 1}.${genIndex + 1}] ${generation.text}`);
    }
  }

  return parts.join("\n\n") || "(empty)";
}

export function createLlmIoCallbackHandler(): BaseCallbackHandler {
  class LlmIoCallbackHandler extends BaseCallbackHandler {
    name = "llm_io_logger";

    handleChatModelStart(
      _llm: unknown,
      messageBatches: BaseMessage[][],
      _runId: string,
      _parentRunId?: string,
      extraParams?: Record<string, unknown>
    ) {
      llmCallCounter += 1;
      const callId = llmCallCounter;
      const timestamp = formatTimestamp();
      const charStats = measureInputCharStats(messageBatches, extraParams);
      return console.log(`\n========== LLM Input #${callId} [${timestamp}] ==========\n`,messageBatches);
      logInput(`\n========== LLM Input #${callId} [${timestamp}] ==========`);
      logInput(formatInputCharStats(charStats));

      for (const [batchIndex, messages] of messageBatches.entries()) {
        if (messageBatches.length > 1) {
          logInput(`--- batch ${batchIndex + 1} ---`);
        }
        logInput(formatMessages(messages));
      }
    }

    handleLLMStart(
      _llm: unknown,
      prompts: string[],
      _runId: string,
      _parentRunId?: string,
      extraParams?: Record<string, unknown>
    ) {
      llmCallCounter += 1;
      const callId = llmCallCounter;
      const timestamp = formatTimestamp();
      const charStats = measureInputCharStats([], extraParams, prompts);
      logInput(`\n========== LLM Input #${callId} [${timestamp}] ==========`);
      logInput(formatInputCharStats(charStats));

      for (const [index, prompt] of prompts.entries()) {
        logInput(`[${index + 1}] ${prompt}`);
      }
    }

    handleLLMEnd(output: LLMResult) {
      const timestamp = formatTimestamp();
      const charStats = measureOutputCharStats(output);
      return console.log(`\n========== LLM Output [${timestamp}] ==========\n`,output);
      logOutput(`\n========== LLM Output [${timestamp}] ==========`);
      logOutput(formatOutputCharStats(charStats));
      logOutput(formatLlmOutput(output));
      logOutput("=================================\n");
    }

    handleLLMError(error: unknown) {
      console.error("\n========== LLM Error ==========");
      console.error(error);
      console.error("===============================\n");
    }
  }

  return new LlmIoCallbackHandler();
}
