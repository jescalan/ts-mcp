import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getEvent } from "vinxi/http";
import { withMcpAuth, clerkAuth } from "@/utils/auth";
import { transports } from "@/utils/server";

export const APIRoute = createAPIFileRoute("/api/messages")({
  POST: withMcpAuth({
    auth: clerkAuth,
    // @ts-ignore
    handler: async ({ request }) => {
      const body = await request.json();
      const url = new URL(request.url);
      const sessionId = url.searchParams.get("sessionId") as string;
      const transport = transports[sessionId];
      if (transport) {
        try {
          getEvent().node.res.statusCode = 200;
          await transport.handleMessage(body, { authInfo: request.auth });
        } catch (error) {
          // @ts-ignore
          getEvent().node.res.send("Error handling message");
        }
      } else {
        // @ts-ignore
        getEvent().node.res.send("No transport found for sessionId");
      }
    },
  }),
});
