import { env } from 'cloudflare:workers';
import { createRequestAuth, type AuthConfig } from './auth-session';

export function authConfig(): AuthConfig | null {
  const values = env as Record<string, unknown>;
  const url = values.PEER_SUPABASE_URL;
  const key = values.PEER_SUPABASE_PUBLISHABLE_KEY;
  const origin = values.PEER_SITE_ORIGIN;
  if (typeof url !== 'string' || typeof key !== 'string' || typeof origin !== 'string') return null;
  return { url, key, origin: new URL(origin).origin };
}

const contexts = new WeakMap<Request, ReturnType<typeof createRequestAuth>>();
export function requestAuth(request: Request) {
  let context = contexts.get(request);
  if (!context) { context = createRequestAuth(request, authConfig()); contexts.set(request, context); }
  return context;
}

/** All identity-aware API responses include refreshed cookies and bypass caches. */
export function withAuth(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => requestAuth(request).finish(await handler(request));
}

let readiness: { url: string; checked: number; enabled: boolean } | undefined;
export async function googleEnabled(): Promise<boolean> {
  const config = authConfig();
  if (!config) return false;
  if (readiness?.url === config.url && Date.now() - readiness.checked < 30000) return readiness.enabled;
  try {
    const response = await fetch(config.url + '/auth/v1/settings', { headers: { apikey: config.key }, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const data = response.ok ? await response.json() as { external?: { google?: boolean } } : null;
    const enabled = data?.external?.google === true;
    readiness = { url: config.url, checked: Date.now(), enabled };
    return enabled;
  } catch { return false; }
}
