import type { Skill } from "./types.js";
import { bitbrowserSkill } from "./bitbrowser.js";
import { codeVerifySkill } from "./codeVerify.js";
import { zentaoSkill } from "./zentao.js";

export interface SkillRegistryOptions {
  zentaoEnabled?: boolean;
  bitbrowserEnabled?: boolean;
}

export function createSkillRegistry(
  options: SkillRegistryOptions = {}
): Skill[] {
  const skills: Skill[] = [codeVerifySkill];

  if (options.bitbrowserEnabled) {
    skills.unshift(bitbrowserSkill);
  }

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

以下 Skill 仅提供轻量说明。需要时必须先调用 \`load_skill\` 激活对应 Skill，再使用其工具。
禁止在未激活 Skill 的情况下用通用产品说明代替实际查询。

${entries}

激活方式：\`load_skill({ skill_id: "<id>" })\`
示例：用户说「列出浏览器窗口」→ 先调用 \`load_skill({ skill_id: "bitbrowser" })\`，再用 BitBrowser 工具操作。`;
}

export function findSkill(skills: Skill[], skillId: string): Skill | undefined {
  return skills.find((skill) => skill.id === skillId);
}
