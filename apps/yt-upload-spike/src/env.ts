export type Env = Cloudflare.Env;

export function authorized(request: Request, env: { SPIKE_TOKEN?: string }): boolean {
  if (!env.SPIKE_TOKEN) return true;
  return request.headers.get("Authorization") === `Bearer ${env.SPIKE_TOKEN}`;
}
