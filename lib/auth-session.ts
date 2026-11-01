import { createServerClient, parseCookieHeader, serializeCookieHeader, type CookieOptions } from '@supabase/ssr';

export type AuthConfig = { url: string; key: string; origin: string };
const COOKIE_NAME = 'peer-sb-auth';

/** Request-scoped Supabase SDK adapter. Tokens stay in HttpOnly cookies. */
export function createRequestAuth(request: Request, config: AuthConfig | null) {
  const incoming = parseCookieHeader(request.headers.get('cookie') || '');
  const cookieJar = new Map(incoming.map(c => [c.name, c.value || '']));
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const hasSession = incoming.some(c => c.name === COOKIE_NAME || c.name.startsWith(COOKIE_NAME + '.'));
  const client = config ? createServerClient(config.url, config.key, {
    cookieOptions: { name: COOKIE_NAME, path: '/', httpOnly: true, secure: config.origin.startsWith('https:'), sameSite: 'lax' },
    cookies: {
      getAll: () => Array.from(cookieJar, ([name, value]) => ({ name, value })),
      setAll: cookies => {
        for (const cookie of cookies) {
          cookieJar.set(cookie.name, cookie.value);
          pending.set(cookie.name, cookie);
        }
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(12000) }) },
  }) : null;
  let actor: Promise<string | null> | undefined;
  return {
    client,
    hasSession,
    getActor(): Promise<string | null> {
      if (!actor) actor = (async () => {
        // A bad/expired Google session must not silently switch to another account.
        if (hasSession) {
          if (!client) return null;
          try {
            const { data: { user }, error } = await client.auth.getUser();
            if (error || !user || user.is_anonymous || !user.email_confirmed_at) return null;
            return 'supabase:' + user.id;
          } catch { return null; }
        }
        // These headers are supplied by Sites dispatch, not by the browser UI.
        return request.headers.get('oai-authenticated-user-id') || null;
      })();
      return actor;
    },
    clearSessionCookies() {
      for (const { name } of incoming) {
        if (name === COOKIE_NAME || name.startsWith(COOKIE_NAME + '.') || name === COOKIE_NAME + '-code-verifier') {
          pending.set(name, { name, value: '', options: { path: '/', maxAge: 0, httpOnly: true, secure: config?.origin.startsWith('https:') ?? true, sameSite: 'lax' } });
        }
      }
    },
    finish(response: Response): Response {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'private, no-store');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      headers.set('Referrer-Policy', 'no-referrer');
      for (const { name, value, options } of pending.values()) headers.append('Set-Cookie', serializeCookieHeader(name, value, options));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    },
  };
}
