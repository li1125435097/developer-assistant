import type { StructuredToolInterface } from "@langchain/core/tools";
import type { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createZentaoMcpClient } from "../mcp/index.js";
import { loadConfig } from "../config.js";
import { createSkillRegistry } from "../skills/index.js";
import type { Skill } from "../skills/index.js";
import { defaultTools } from "./index.js";

export interface LoadAgentToolsResult {
  tools: StructuredToolInterface[];
  skills: Skill[];
  mcpClient?: MultiServerMCPClient;
}

export async function loadAgentTools(): Promise<LoadAgentToolsResult> {
  const config = loadConfig();

  if (!config.zentaoMcpEnabled) {
    return {
      tools: [...defaultTools],
      skills: createSkillRegistry({ zentaoEnabled: false }),
    };
  }

  const mcpClient = createZentaoMcpClient();

  return {
    tools: [...defaultTools],
    skills: createSkillRegistry({ zentaoEnabled: true }),
    mcpClient,
  };
}
