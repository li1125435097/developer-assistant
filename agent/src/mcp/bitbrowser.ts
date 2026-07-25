import { MultiServerMCPClient } from "@langchain/mcp-adapters";

export const BITBROWSER_MCP_SERVER_NAME = "bitbrowser";
export const DEFAULT_BITBROWSER_MCP_URL = "http://127.0.0.1:54345/mcp";

export function getBitbrowserMcpServerConfig(
  url: string = DEFAULT_BITBROWSER_MCP_URL
) {
  return { url };
}

export function createBitbrowserMcpClient(
  url: string = DEFAULT_BITBROWSER_MCP_URL
): MultiServerMCPClient {
  return new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    onConnectionError: "throw",
    mcpServers: {
      [BITBROWSER_MCP_SERVER_NAME]: getBitbrowserMcpServerConfig(url),
    },
  });
}
