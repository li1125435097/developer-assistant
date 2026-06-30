import { ToolMessage } from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { Command } from "@langchain/langgraph";
import { createMiddleware, tool } from "langchain";
import { z } from "zod";
import { buildSkillCatalogPrompt, findSkill } from "./registry.js";
import type { Skill } from "./types.js";

const LOAD_SKILL_DESCRIPTION = `Activate a Skill to load its full instructions and tools for this conversation.

Call this when the user's request clearly matches a Skill in the catalog (e.g. Zentao bugs/tasks, code build/test verification).
Do not activate Skills for unrelated chit-chat or questions answerable with base tools only.`;

const skillStateSchema = z.object({
  activatedSkills: z.array(z.string()).default([]),
});

export interface CreateSkillMiddlewareOptions {
  skills: Skill[];
  mcpClient?: MultiServerMCPClient;
}

export function createSkillMiddleware(options: CreateSkillMiddlewareOptions) {
  const { skills, mcpClient } = options;
  const skillToolCache = new Map<string, StructuredToolInterface[]>();
  const catalogPrompt = buildSkillCatalogPrompt(skills);
  const skillIds = new Set(skills.map((skill) => skill.id));

  async function getSkillTools(skillId: string): Promise<StructuredToolInterface[]> {
    const cached = skillToolCache.get(skillId);
    if (cached) {
      return cached;
    }

    const skill = findSkill(skills, skillId);
    if (!skill) {
      return [];
    }

    const loaded = await skill.loadTools({ mcpClient });
    skillToolCache.set(skillId, loaded);
    return loaded;
  }

  const loadSkillTool = tool(
    () => "Use wrapToolCall handler for load_skill execution.",
    {
      name: "load_skill",
      description: LOAD_SKILL_DESCRIPTION,
      schema: z.object({
        skill_id: z
          .string()
          .describe(`Skill id to activate. Available: ${[...skillIds].join(", ")}`),
      }),
    }
  );

  return createMiddleware({
    name: "SkillMiddleware",
    stateSchema: skillStateSchema,
    tools: [loadSkillTool],
    wrapToolCall: async (request, handler) => {
      if (request.toolCall.name !== "load_skill") {
        return handler(request);
      }

      const args = request.toolCall.args as { skill_id?: string };
      const skillId = args.skill_id?.trim();

      if (!skillId || !skillIds.has(skillId)) {
        return new ToolMessage({
          content: `Unknown skill "${skillId ?? ""}". Available: ${[...skillIds].join(", ")}`,
          tool_call_id: request.toolCall.id ?? "",
          name: "load_skill",
        });
      }

      const skill = findSkill(skills, skillId)!;
      const activated = request.state.activatedSkills ?? [];

      if (activated.includes(skillId)) {
        return new ToolMessage({
          content: `Skill "${skill.name}" is already active.\n\n${skill.fullInstructions}`,
          tool_call_id: request.toolCall.id ?? "",
          name: "load_skill",
        });
      }

      const skillTools = await getSkillTools(skillId);
      const toolNames = skillTools.map((skillTool) => skillTool.name).join(", ");

      return new Command({
        update: {
          activatedSkills: [...activated, skillId],
          messages: [
            new ToolMessage({
              content: [
                `Skill "${skill.name}" activated.`,
                skill.fullInstructions,
                toolNames ? `\nAvailable tools: ${toolNames}` : "",
              ].join("\n\n"),
              tool_call_id: request.toolCall.id ?? "",
              name: "load_skill",
            }),
          ],
        },
      });
    },
    wrapModelCall: async (request, handler) => {
      const activated = request.state.activatedSkills ?? [];
      const skillTools: StructuredToolInterface[] = [];

      for (const skillId of activated) {
        skillTools.push(...(await getSkillTools(skillId)));
      }

      const baseToolNames = new Set(request.tools.map((agentTool) => agentTool.name));
      const mergedTools = [
        ...request.tools,
        ...skillTools.filter((skillTool) => !baseToolNames.has(skillTool.name)),
      ];

      const activeSkillPrompt = activated
        .map((skillId) => findSkill(skills, skillId)?.fullInstructions)
        .filter(Boolean)
        .join("\n\n");

      const extraPrompt = [catalogPrompt, activeSkillPrompt].filter(Boolean).join("\n\n");
      const systemMessage = extraPrompt
        ? request.systemMessage.concat(`\n\n${extraPrompt}`)
        : request.systemMessage;

      return handler({
        ...request,
        tools: mergedTools,
        systemMessage,
      });
    },
  });
}
