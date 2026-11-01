import { authConfig, googleEnabled, requestAuth, withAuth } from '@/lib/supabase-auth';
import { safeReturnPath } from '@/lib/auth-paths';
export const dynamic = 'force-dynamic';
export const GET = withAuth(async request => {
  const config = authConfig();
  const next = safeReturnPath(new URL(request.url).searchParams.get('next'));
  const origin = config?.origin || new URL(request.url).origin;
  const errorURL = new URL('/login', origin);
  errorURL.searchParams.set('next', next);
  const client = requestAuth(request).client;
  if (!config || !client || !await googleEnabled()) {
    errorURL.searchParams.set('error', 'unavailable');
    return Response.redirect(errorURL, 303);
  }
  try {
    const callback = new URL('/auth/google/callback', config.origin);
    callback.searchParams.set('next', next);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString(), skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (!error && data.url) return Response.redirect(data.url, 303);
  } catch { /* Keep provider details and tokens out of the response. */ }
  errorURL.searchParams.set('error', 'failed');
  return Response.redirect(errorURL, 303);
});
