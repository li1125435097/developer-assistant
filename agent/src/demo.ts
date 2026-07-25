import "dotenv/config";
import { createDeveloperAgentWithMcp } from "./agents/index.js";
import { createSummarizeChain } from "./chains/index.js";
import { loadConfig } from "./config.js";
import { createBitbrowserMcpClient } from "./mcp/index.js";
import { createSkillRegistry } from "./skills/index.js";

async function main() {
  const config = loadConfig();
  console.log(`Connecting to OpenAI-compatible API at ${config.baseURL} (model: ${config.model})`);

  const chain = createSummarizeChain();
  const summary = await chain.invoke({
    text: "LangChain agent initialized with OpenAI-compatible API.",
  });
  console.log("\n[Chain] Summary:", summary);

  const skills = createSkillRegistry({
    zentaoEnabled: config.zentaoMcpEnabled,
    bitbrowserEnabled: config.bitbrowserMcpEnabled,
  });
  console.log(
    `\n[Skills] Catalog (${skills.length}):`,
    skills.map((skill) => `${skill.id} — ${skill.name}`).join(", ")
  );

  if (config.bitbrowserMcpEnabled) {
    const bitbrowserClient = createBitbrowserMcpClient(config.bitbrowserMcpUrl);
    try {
      const bitbrowserTools = await bitbrowserClient.getTools();
      console.log(
        `\n[MCP] BitBrowser tools available on demand via load_skill("bitbrowser"): ${bitbrowserTools.length} tools`
      );
    } finally {
      await bitbrowserClient.close();
    }
  }

  const { agent, mcpClient } = await createDeveloperAgentWithMcp();
  try {
    const result = await agent.invoke({
      messages: [{ role: "user", content: "列出浏览器窗口" }],
    });

    const lastMessage = result.messages.at(-1);
    console.log("\n[Agent] Response:", lastMessage?.content);
  } finally {
    await mcpClient?.close();
  }
}

main().catch((error) => {
  console.error("Agent demo failed:", error);
  process.exit(1);
});
