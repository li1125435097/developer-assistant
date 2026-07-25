import type { Skill } from "./types.js";
import { BITBROWSER_MCP_SERVER_NAME } from "../mcp/bitbrowser.js";

export const bitbrowserSkill: Skill = {
  id: "bitbrowser",
  name: "BitBrowser Skill",
  briefDescription:
    "通过 BitBrowser MCP 管理浏览器窗口与自动化操作；适用于「打开浏览器」「列出窗口」「指纹浏览器」等需求。",
  fullInstructions: `## BitBrowser Skill（已激活）

通过 MCP 工具（前缀 \`bitbrowser__\`）管理 BitBrowser 浏览器窗口与自动化流程。

使用要点：
- 先用列表/查询类工具了解当前窗口与环境，再执行打开、关闭或自动化操作
- 回复用户时提炼关键结果，避免原样倾倒原始 JSON`,
  loadTools: async ({ mcpClient }) => {
    if (!mcpClient) {
      throw new Error(
        "BitBrowser MCP is not enabled. Set BITBROWSER_MCP_ENABLED=true."
      );
    }

    return mcpClient.getTools(BITBROWSER_MCP_SERVER_NAME);
  },
};
