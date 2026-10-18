declare namespace Cloudflare {
  interface Env {
    SPIKE: string;
    PLAN: string;
    /** Set with `wrangler secret put`. Empty in local tests, so those tests skip auth. */
    SPIKE_TOKEN?: string;
    /** Short-lived Drive download token. Never put this in workflow params or logs. */
    DRIVE_ACCESS_TOKEN?: string;
    UPLOAD_WORKFLOW: Workflow;
    UPLOAD_QUEUE: Queue;
    BUCKET: R2Bucket;
    /** Loopback to this worker. Workflow steps use it for the mock source and sink. */
    API: Fetcher;
    SESSIONS: DurableObjectNamespace;
  }
}
