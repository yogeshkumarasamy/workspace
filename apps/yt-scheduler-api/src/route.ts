import { createApi, type ApiDeps } from "./app.ts";
import { serveMcp } from "./mcp.ts";

/** `/mcp` is the stateless MCP server. Every other path stays on the Hono API. */
export async function handleFetch(request: Request, env: unknown, ctx: ExecutionContext, deps: ApiDeps): Promise<Response> {
  if (new URL(request.url).pathname === "/mcp") return serveMcp(request, env, ctx, deps);
  return createApi(deps).fetch(request);
}
