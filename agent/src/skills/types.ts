import type { StructuredToolInterface } from "@langchain/core/tools";
import type { MultiServerMCPClient } from "@langchain/mcp-adapters";

export interface SkillLoadContext {
  mcpClient?: MultiServerMCPClient;
}

export interface Skill {
  id: string;
  name: string;
  /** Lightweight description for the skill catalog (~几十 tokens). */
  briefDescription: string;
  /** Full instructions loaded on demand after activation. */
  fullInstructions: string;
  loadTools: (context: SkillLoadContext) => Promise<StructuredToolInterface[]>;
}
