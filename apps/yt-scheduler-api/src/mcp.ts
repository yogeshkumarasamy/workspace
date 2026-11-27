import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { createApi, type ApiDeps } from "./app.ts";
import { timingSafeEqual } from "./crypto.ts";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const CUSTOM_HOST = "yt-scheduler-api.yogeshkumarasamy.in";

type ApiApp = ReturnType<typeof createApi>;

const sourceSchema = z.union([
  z.object({ driveFileId: z.string().min(10) }),
  z.object({ url: z.string().min(1) }),
]);

const metadataSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  defaultLanguage: z.string().optional(),
  defaultAudioLanguage: z.string().optional(),
  madeForKids: z.boolean().optional(),
  containsSyntheticMedia: z.boolean().optional(),
  type: z.enum(["short", "long"]).optional(),
  privacyStatus: z.enum(["private", "unlisted", "public"]).optional(),
  publishAt: z.string().optional(),
  playlist: z.string().optional(),
  createPlaylistIfMissing: z.boolean().optional(),
  channel: z.string().optional(),
});

const jobSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  channel: z.string().min(2).optional(),
  video: sourceSchema,
  thumbnail: sourceSchema.optional(),
  metadata: metadataSchema,
  uploadMode: z.enum(["now", "at"]).optional(),
  uploadAt: z.string().optional(),
});

const createUploadJobSchema = z.union([
  jobSchema,
  z.object({ jobs: z.array(jobSchema).min(1).max(200) }),
]);

const driveImportSchema = z.object({
  folderId: z.string().min(10),
  channel: z.string().min(2).optional(),
  idempotencyKey: z.string().optional(),
  recursive: z.boolean().optional(),
});

const jobStatusSchema = z.enum(["queued", "uploading", "processing", "scheduled", "published", "failed", "cancelled"]);

/** Hosts this Worker actually serves: local dev, workers.dev previews, and the production custom domain. */
export function mcpHostnameAllowed(hostname: string): boolean {
  if (LOCAL_HOSTS.includes(hostname) || hostname === CUSTOM_HOST) return true;
  if (!hostname.endsWith(".workers.dev")) return false;
  const name = hostname.slice(0, -".workers.dev".length);
  return name === "yt-scheduler-api" || name.startsWith("yt-scheduler-api-") || name.startsWith("yt-scheduler-api.");
}

export function presentedApiKey(headers: Headers): string {
  const header = headers.get("x-api-key")?.trim() ?? "";
  if (header) return header;
  const authorization = headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization);
  return match?.[1] ?? "";
}

function mcpAuthorized(request: Request, apiKey: string): boolean {
  if (!apiKey) return false;
  return timingSafeEqual(presentedApiKey(request.headers), apiKey);
}

function hostnamesFor(hostname: string): string[] {
  return LOCAL_HOSTS.includes(hostname) ? [...LOCAL_HOSTS] : [hostname];
}

function originsFor(hostname: string): string[] {
  return [...new Set([
    ...LOCAL_HOSTS,
    hostname,
    "yt-scheduler.yogeshkumarasamy.in",
    "dev.yogeshkumarasamy.in",
    "staging.yogeshkumarasamy.in",
    "yogeshkumarasamy.in",
  ])];
}

async function callApi(app: ApiApp, apiKey: string, method: string, path: string, body?: unknown): Promise<CallToolResult> {
  const headers = new Headers({ "x-api-key": apiKey });
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await app.request(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }
  return {
    content: [{ type: "text", text: JSON.stringify({ status: response.status, body: parsed }) }],
    isError: response.status >= 400,
  };
}

function queryPath(path: string, query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Fresh server per MCP request. Tools call the Hono app in-process; they never fetch this Worker over the network. */
export function createSchedulerMcp(app: ApiApp, apiKey: string): McpServer {
  const server = new McpServer({ name: "yt-scheduler", version: "0.1.0" });

  server.registerTool(
    "list_channels",
    { description: "List connected YouTube channels. Does not return refresh tokens.", inputSchema: z.object({}) },
    async () => callApi(app, apiKey, "GET", "/api/channels"),
  );
  server.registerTool(
    "get_quota",
    { description: "YouTube upload quota used today for this Google Cloud project, plus uploads left.", inputSchema: z.object({}) },
    async () => callApi(app, apiKey, "GET", "/api/quota"),
  );
  server.registerTool(
    "list_playlists",
    {
      description: "List playlists on one connected channel. channel is a YouTube channel id, handle, or internal id.",
      inputSchema: z.object({ channel: z.string().min(2) }),
    },
    async ({ channel }) => callApi(app, apiKey, "GET", `/api/channels/${encodeURIComponent(channel)}/playlists`),
  );
  server.registerTool(
    "create_upload_job",
    {
      description: "Create one upload job, or a batch when `jobs` is set. uploadMode is \"now\" (default) or \"at\" (requires uploadAt). A future publishAt is scheduled on YouTube.",
      inputSchema: createUploadJobSchema,
    },
    async (input) => {
      const body = "jobs" in input ? { jobs: input.jobs } : input;
      return callApi(app, apiKey, "POST", "/api/jobs", body);
    },
  );
  server.registerTool(
    "list_jobs",
    {
      description: "List upload jobs. Optional filters: channel, status, limit (default 200).",
      inputSchema: z.object({
        channel: z.string().min(2).optional(),
        status: jobStatusSchema.optional(),
        limit: z.number().int().positive().max(200).optional(),
      }),
    },
    async ({ channel, status, limit }) => callApi(app, apiKey, "GET", queryPath("/api/jobs", { channel, status, limit })),
  );
  server.registerTool(
    "get_job",
    { description: "Fetch one upload job by id, including youtubeVideoId when the upload has started.", inputSchema: z.object({ id: z.string().min(1) }) },
    async ({ id }) => callApi(app, apiKey, "GET", `/api/jobs/${encodeURIComponent(id)}`),
  );
  server.registerTool(
    "cancel_job",
    { description: "Cancel a queued or failed job. Uploaded videos must be changed in YouTube Studio.", inputSchema: z.object({ id: z.string().min(1) }) },
    async ({ id }) => callApi(app, apiKey, "POST", `/api/jobs/${encodeURIComponent(id)}/cancel`),
  );
  server.registerTool(
    "retry_job",
    { description: "Queue a failed or cancelled job again and start its upload.", inputSchema: z.object({ id: z.string().min(1) }) },
    async ({ id }) => callApi(app, apiKey, "POST", `/api/jobs/${encodeURIComponent(id)}/retry`),
  );
  server.registerTool(
    "reschedule_job",
    {
      description: "Move a job's publishAt. If the video is already on YouTube, the new time is sent with videos.update.",
      inputSchema: z.object({ id: z.string().min(1), publishAt: z.string().min(1) }),
    },
    async ({ id, publishAt }) => callApi(app, apiKey, "POST", `/api/jobs/${encodeURIComponent(id)}/reschedule`, { publishAt }),
  );
  server.registerTool(
    "bulk_jobs",
    {
      description: "Apply one action to many jobs: cancel, retry, reschedule, autoslot, or delete. reschedule requires publishAt.",
      inputSchema: z.object({
        ids: z.array(z.string().min(1)).min(1),
        action: z.enum(["cancel", "retry", "reschedule", "autoslot", "delete"]),
        publishAt: z.string().optional(),
      }),
    },
    async (input) => callApi(app, apiKey, "POST", "/api/jobs/bulk", input),
  );
  server.registerTool(
    "get_next_slot",
    {
      description: "Next free publish time for a channel. type is short or long (default long).",
      inputSchema: z.object({ channel: z.string().min(2), type: z.enum(["short", "long"]).optional() }),
    },
    async ({ channel, type }) => callApi(app, apiKey, "GET", queryPath("/api/slots/next", { channel, type })),
  );
  server.registerTool(
    "tick_uploads",
    { description: "Start uploads for queued jobs whose runAt has passed.", inputSchema: z.object({}) },
    async () => callApi(app, apiKey, "POST", "/api/tick"),
  );
  server.registerTool(
    "list_drive_folder",
    {
      description: "List files in a Drive folder. folderId defaults to root. channel is optional when only one channel is connected.",
      inputSchema: z.object({ channel: z.string().min(2).optional(), folderId: z.string().min(1).optional() }),
    },
    async ({ channel, folderId }) => callApi(app, apiKey, "GET", queryPath("/api/drive/list", { channel, folderId })),
  );
  server.registerTool(
    "preview_drive_import",
    {
      description: "Dry-run a Drive folder import. Returns the jobs that would be created and any skipped files. Does not upload.",
      inputSchema: driveImportSchema,
    },
    async (input) => callApi(app, apiKey, "POST", "/api/drive/import", { ...input, dryRun: true }),
  );
  server.registerTool(
    "import_drive_folder",
    {
      description: "Import a Drive folder of videos and create upload jobs. This starts uploads.",
      inputSchema: driveImportSchema,
    },
    async (input) => callApi(app, apiKey, "POST", "/api/drive/import", { ...input, dryRun: false }),
  );
  server.registerTool(
    "get_metadata_doc",
    {
      description: "Read one Drive text file, JSON sidecar, or Google Doc (exported as plain text). Use this for an episode's metadata.json or metadata doc. channel is optional when only one channel is connected.",
      inputSchema: z.object({ fileId: z.string().min(1), channel: z.string().min(2).optional() }),
    },
    async ({ fileId, channel }) => callApi(app, apiKey, "GET", queryPath(`/api/drive/text/${encodeURIComponent(fileId)}`, { channel })),
  );
  server.registerTool(
    "get_youtube_status",
    {
      description: "Live YouTube publish status for an uploaded job (videos.list snippet and status: privacyStatus, publishAt, uploadStatus, processingStatus). Errors when the job has no youtubeVideoId yet.",
      inputSchema: z.object({ id: z.string().min(1) }),
    },
    async ({ id }) => callApi(app, apiKey, "GET", `/api/jobs/${encodeURIComponent(id)}/youtube`),
  );

  return server;
}

/**
 * Stateless Streamable HTTP MCP. API key is required (x-api-key or Authorization: Bearer).
 * Browser OAuth routes and GET /api/google/access-token are not tools.
 */
export async function serveMcp(request: Request, env: unknown, ctx: ExecutionContext, deps: ApiDeps): Promise<Response> {
  const hostname = new URL(request.url).hostname;
  if (!mcpHostnameAllowed(hostname)) return Response.json({ error: "forbidden host" }, { status: 403 });
  if (request.method !== "OPTIONS" && !mcpAuthorized(request, deps.apiKey)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const app = createApi(deps);
  const handler = createMcpHandler(() => createSchedulerMcp(app, deps.apiKey), {
    route: "/mcp",
    allowedHostnames: hostnamesFor(hostname),
    allowedOriginHostnames: originsFor(hostname),
    legacy: "stateless",
    responseMode: "auto",
  });
  return handler(request, env, ctx);
}
