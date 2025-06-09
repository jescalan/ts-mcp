import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getEvent } from "vinxi/http";
import withAuth from "@/utils/auth";
import { transports } from "@/utils/server";

export const APIRoute = createAPIFileRoute("/api/messages")({
  // @ts-ignore
  POST: withAuth({
    auth: async () => {
      return { userId: "123" };
    },
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
          getEvent().node.res.send("Error handling message");
        }
      } else {
        getEvent().node.res.send("No transport found for sessionId");
      }
    },
  }),
});
