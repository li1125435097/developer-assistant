import { tool } from "langchain";
import { z } from "zod";
import type { Skill } from "./types.js";

const runProjectCheckTool = tool(
  () =>
    "Project check is not wired yet. Use this skill after local build/test tools are added.",
  {
    name: "run_project_check",
    description: "Run project build or test checks (placeholder until wired)",
    schema: z.object({
      target: z
        .enum(["build", "test", "lint"])
        .optional()
        .describe("Which check to run"),
    }),
  }
);

export const codeVerifySkill: Skill = {
  id: "code_verify",
  name: "代码修改验证 Skill",
  briefDescription:
    "在修改项目代码后运行构建/测试/静态检查；适用于「改完代码帮我验证」「跑一下测试」等需求。",
  fullInstructions: `## 代码修改验证 Skill（已激活）

在修改代码后验证变更是否安全可用：

1. 先确认用户修改了哪些文件或模块
2. 按需调用 \`run_project_check\`（build / test / lint）
3. 汇总结果：通过项、失败项、建议的下一步

注意：完整构建/测试命令将在后续接入项目脚本后替换占位实现。`,
  loadTools: async () => [runProjectCheckTool],
};
