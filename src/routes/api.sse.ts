import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getEvent } from "vinxi/http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { transports, server } from "@/utils/server";
import { withMcpAuth, clerkAuth } from "@/utils/auth";

export const APIRoute = createAPIFileRoute("/api/sse")({
  GET: withMcpAuth({
    auth: clerkAuth,
    // @ts-ignore
    handler: async () => {
      const transport = new SSEServerTransport(
        "/api/messages",
        getEvent().node.res
      );
      transports[transport.sessionId] = transport;
      transport.onerror = (error) => {
        console.error(error);
      };
      getEvent().node.res.on("close", () => {
        delete transports[transport.sessionId];
      });

      await server.connect(transport);
    },
  }),
});
