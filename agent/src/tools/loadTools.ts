import type { StructuredToolInterface } from "@langchain/core/tools";
import {
  MultiServerMCPClient,
  type Connection,
} from "@langchain/mcp-adapters";
import {
  BITBROWSER_MCP_SERVER_NAME,
  getBitbrowserMcpServerConfig,
  getZentaoMcpServerConfig,
  ZENTAO_MCP_SERVER_NAME,
} from "../mcp/index.js";
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
  const mcpServers: Record<string, Connection> = {};

  if (config.zentaoMcpEnabled) {
    mcpServers[ZENTAO_MCP_SERVER_NAME] = getZentaoMcpServerConfig();
  }

  if (config.bitbrowserMcpEnabled) {
    mcpServers[BITBROWSER_MCP_SERVER_NAME] = getBitbrowserMcpServerConfig(
      config.bitbrowserMcpUrl
    );
  }

  const skills = createSkillRegistry({
    zentaoEnabled: config.zentaoMcpEnabled,
    bitbrowserEnabled: config.bitbrowserMcpEnabled,
  });

  if (Object.keys(mcpServers).length === 0) {
    return {
      tools: [...defaultTools],
      skills,
    };
  }

  const mcpClient = new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    onConnectionError: "throw",
    mcpServers,
  });

  return {
    tools: [...defaultTools],
    skills,
    mcpClient,
  };
}
