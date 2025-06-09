import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

export const server = new McpServer({
  name: "mcp-starter",
  version: "1.0.0",
});
export const transports: { [sessionId: string]: SSEServerTransport } = {};

server.tool(
  "roll_dice",
  "Rolls an N-sided die",
  { sides: z.number().int().min(2) },
  async ({ sides }, { authInfo }) => {
    console.log("authInfo", authInfo);
    const value = 1 + Math.floor(Math.random() * sides);
    return {
      content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
    };
  }
);
