import type { Skill } from "./types.js";

export const zentaoSkill: Skill = {
  id: "zentao",
  name: "禅道查询 Skill",
  briefDescription:
    "查询和管理禅道任务、Bug、项目；适用于「查未解决 Bug」「我的任务」「更新禅道」等需求。",
  fullInstructions: `## 禅道 Skill（已激活）

通过 MCP 工具（前缀 \`zentao-dev__\`）管理禅道任务、Bug、项目及相关开发流程。

使用要点：
- 若禅道尚未配置，先调用 \`zentao-dev__initZentao\`；配置保存在 ~/.zentao/config.json
- 查询 Bug/任务时优先用列表类工具，再按需查看详情
- 回复用户时提炼关键字段（编号、标题、状态、负责人），避免原样倾倒原始 JSON`,
  loadTools: async ({ mcpClient }) => {
    if (!mcpClient) {
      throw new Error("Zentao MCP is not enabled. Set ZENTAO_MCP_ENABLED=true.");
    }

    return mcpClient.getTools();
  },
};
