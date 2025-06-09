import { getAuth } from "@clerk/tanstack-react-start/server";

declare global {
  interface Request {
    auth?: any;
  }
}

/**
 * Framework-agnostic authentication middleware for MCP servers
 */
export function withMcpAuth({
  handler,
  auth,
}: {
  handler: ({ request }: { request: Request }) => Promise<Response>;
  auth: ({
    token,
    request,
  }: {
    token: string;
    request: Request;
  }) => Promise<Record<string, any>>;
}) {
  return async ({ request }: { request: Request }) => {
    const origin = new URL(request.url).origin;

    // if no authorization header, return 401
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return unauthorized(origin);

    // if the authorization header is not a bearer token, or the token is
    // empty, return 401
    const [type, token] = authHeader?.split(" ") || [];
    if (type?.toLowerCase() !== "bearer") return unauthorized(origin);
    if (!token) return unauthorized(origin);

    // pass token and request to auth function, if it returns a falsy value,
    // return 401
    const authResponse = await auth({ token, request });
    if (!authResponse) return unauthorized(origin);

    // put the auth info on the request object, the mcp sdk will make it
    // available within tool call handlers
    request.auth = authResponse;

    return handler({ request });
  };
}

function unauthorized(origin: string) {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer resource_metadata=${origin}/.well-known/oauth-protected-resource`,
    },
  });
}

/**
 * Authorizes the request for Clerk as an auth provider.
 */
export async function clerkAuth({ request }: { request: Request }) {
  const authObject = await getAuth(request, {
    acceptsToken: "oauth_token",
  });
  if (!authObject.subject) {
    throw new Error("OAuth access token is invalid");
  }
  return { subject: authObject.subject, scopes: authObject.scopes };
}
