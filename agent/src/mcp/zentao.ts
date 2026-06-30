import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

export const ZENTAO_MCP_SERVER_NAME = "zentao-dev";

function resolveZentaoDevEntry(): string {
  const agentRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.."
  );

  const standaloneEntry = path.join(
    agentRoot,
    "node_modules/@zzp123/mcp-zentao-dev/dist/index.js"
  );
  const bundledDevEntry = path.join(
    agentRoot,
    "node_modules/@zzp123/mcp-zentao/dist/index-dev.js"
  );

  // Standalone @zzp123/mcp-zentao-dev may ship without helper modules; prefer the full package dev entry.
  if (existsSync(bundledDevEntry)) {
    return bundledDevEntry;
  }

  return standaloneEntry;
}

export function createZentaoMcpClient(): MultiServerMCPClient {
  return new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    onConnectionError: "throw",
    mcpServers: {
      [ZENTAO_MCP_SERVER_NAME]: {
        transport: "stdio",
        command: process.execPath,
        args: [resolveZentaoDevEntry()],
      },
    },
  });
}
