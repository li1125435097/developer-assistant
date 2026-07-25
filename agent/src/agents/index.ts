import { createAgent } from "langchain";
import type { AnyAgentMiddleware } from "langchain";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { ChatOpenAI } from "@langchain/openai";
import type { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createLLM } from "../llm.js";
import { createSkillMiddleware } from "../skills/index.js";
import type { Skill } from "../skills/index.js";
import { defaultTools } from "../tools/index.js";
import { loadAgentTools } from "../tools/loadTools.js";

const BASE_SYSTEM_PROMPT = `You are a developer assistant for the developer-assistant project.
Help users with scripting, automation, and developer workflows.
Use tools when they help answer the question accurately.

When a request matches a Skill in the catalog, you MUST call load_skill first, then use that Skill's tools.
Do NOT answer from general product knowledge when a Skill can query live data or control a real system.
For requests like 「列出浏览器窗口」「打开浏览器」「BitBrowser」, call load_skill({ skill_id: "bitbrowser" }) immediately.
For requests like 「查询禅道bug」「我的任务」「未解决 Bug」, call load_skill({ skill_id: "zentao" }) immediately.`;

export interface CreateDeveloperAgentOptions {
  llm?: ChatOpenAI;
  tools?: StructuredToolInterface[];
  skills?: Skill[];
  mcpClient?: MultiServerMCPClient;
  middleware?: AnyAgentMiddleware[];
}

export interface CreateDeveloperAgentResult {
  agent: ReturnType<typeof createAgent>;
  mcpClient?: MultiServerMCPClient;
}

function buildMiddleware(
  options: CreateDeveloperAgentOptions
): AnyAgentMiddleware[] {
  const middleware = [...(options.middleware ?? [])];

  if (options.skills && options.skills.length > 0) {
    middleware.push(
      createSkillMiddleware({
        skills: options.skills,
        mcpClient: options.mcpClient,
      })
    );
  }

  return middleware;
}

export function createDeveloperAgent(options: CreateDeveloperAgentOptions = {}) {
  const llm = options.llm ?? createLLM();
  const tools = options.tools ?? defaultTools;
  const middleware = buildMiddleware(options);

  return createAgent({
    model: llm,
    tools,
    systemPrompt: BASE_SYSTEM_PROMPT,
    ...(middleware.length > 0 ? { middleware } : {}),
  });
}

export async function createDeveloperAgentWithMcp(
  options: CreateDeveloperAgentOptions = {}
): Promise<CreateDeveloperAgentResult> {
  const loaded = await loadAgentTools();
  const mcpClient = options.mcpClient ?? loaded.mcpClient;
  const skills = options.skills ?? loaded.skills;

  const agent = createDeveloperAgent({
    ...options,
    tools: options.tools ?? loaded.tools,
    skills,
    mcpClient,
  });

  return { agent, mcpClient };
}
