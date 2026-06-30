import type { Skill } from "./types.js";
import { codeVerifySkill } from "./codeVerify.js";
import { zentaoSkill } from "./zentao.js";

export interface SkillRegistryOptions {
  zentaoEnabled?: boolean;
}

export function createSkillRegistry(
  options: SkillRegistryOptions = {}
): Skill[] {
  const skills: Skill[] = [codeVerifySkill];

  if (options.zentaoEnabled) {
    skills.unshift(zentaoSkill);
  }

  return skills;
}

export function buildSkillCatalogPrompt(skills: Skill[]): string {
  if (skills.length === 0) {
    return "";
  }

  const entries = skills
    .map((skill) => `- **${skill.name}** (\`${skill.id}\`): ${skill.briefDescription}`)
    .join("\n");

  return `## Skill 目录

以下 Skill 仅提供轻量说明。需要时先调用 \`load_skill\` 激活对应 Skill，再使用其工具。

${entries}

激活方式：\`load_skill({ skill_id: "<id>" })\``;
}

export function findSkill(skills: Skill[], skillId: string): Skill | undefined {
  return skills.find((skill) => skill.id === skillId);
}
