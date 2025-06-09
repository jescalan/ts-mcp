import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getEvent } from "vinxi/http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import withMcpAuth from "@/utils/auth";

import { transports, server } from "@/utils/server";

export const APIRoute = createAPIFileRoute("/api/sse")({
  GET: withMcpAuth({
    auth: async () => {
      return { userId: "123" };
    },
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
