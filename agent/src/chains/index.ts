import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import type { ChatOllama } from "@langchain/ollama";
import { createOllamaLLM } from "../llm.js";

const summarizePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You summarize developer notes clearly and concisely. Keep the same language as the input.",
  ],
  ["human", "{text}"],
]);

export function createSummarizeChain(llm: ChatOllama = createOllamaLLM()) {
  return summarizePrompt.pipe(llm).pipe(new StringOutputParser());
}
