import { tool } from "langchain";
import { z } from "zod";

export const echoTool = tool(
  (input) => `Echo: ${input.text}`,
  {
    name: "echo",
    description: "Repeat the given text back to the user",
    schema: z.object({
      text: z.string().describe("Text to echo"),
    }),
  }
);

export const getCurrentTimeTool = tool(
  () => new Date().toISOString(),
  {
    name: "get_current_time",
    description: "Get the current UTC time in ISO format",
    schema: z.object({}),
  }
);

export const defaultTools = [echoTool, getCurrentTimeTool];
