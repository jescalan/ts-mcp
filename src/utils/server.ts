import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
// @ts-ignore
import { type MachineAuthObject } from "@clerk/backend";
import { clerkClient } from "@clerk/tanstack-react-start/server";

export const server = new McpServer({
  name: "mcp-starter",
  version: "1.0.0",
});

export const transports: { [sessionId: string]: SSEServerTransport } = {};

const clerk = await clerkClient();

server.tool(
  "get_clerk_user_info",
  "Returns user data about the Clerk user that authorized this tool call",
  {},
  async (_, { authInfo }) => {
    const clerkAuthInfo =
      authInfo as unknown as MachineAuthObject<"oauth_token">;
    if (!clerkAuthInfo?.subject) {
      console.error(authInfo);
      return {
        content: [{ type: "text", text: "Error: user not authenticated" }],
      };
    }
    const user = await clerk.users.getUser(clerkAuthInfo.subject);
    return {
      content: [{ type: "text", text: JSON.stringify(user) }],
    };
  }
);
