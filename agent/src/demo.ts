import "dotenv/config";
import { createDeveloperAgentWithMcp } from "./agents/index.js";
import { createSummarizeChain } from "./chains/index.js";
import { loadConfig } from "./config.js";
import { createZentaoMcpClient } from "./mcp/index.js";
import { createSkillRegistry } from "./skills/index.js";

async function main() {
  const config = loadConfig();
  console.log(`Connecting to Ollama at ${config.ollamaBaseUrl} (model: ${config.model})`);

  const chain = createSummarizeChain();
  const summary = await chain.invoke({
    text: "LangChain agent initialized with local Ollama.",
  });
  console.log("\n[Chain] Summary:", summary);

  const skills = createSkillRegistry({ zentaoEnabled: config.zentaoMcpEnabled });
  console.log(
    `\n[Skills] Catalog (${skills.length}):`,
    skills.map((skill) => `${skill.id} — ${skill.name}`).join(", ")
  );


  if (config.zentaoMcpEnabled) {
    const zentaoClient = createZentaoMcpClient();
    try {
      const zentaoTools = await zentaoClient.getTools();
      console.log(
        `\n[MCP] Zentao tools available on demand via load_skill("zentao"): ${zentaoTools.length} tools`
      );
    } finally {
      await zentaoClient.close();
    }

  }

  const { agent, mcpClient } = await createDeveloperAgentWithMcp();
  try {
    const result = await agent.invoke({
      // messages: [{ role: "user", content: "What time is it right now?" }],
      messages: [{ role: "user", content: "查询禅道bug" }],
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

