import { authConfig, requestAuth, withAuth } from '@/lib/supabase-auth';
import { safeReturnPath } from '@/lib/auth-paths';
export const dynamic = 'force-dynamic';
export const GET = withAuth(async request => {
  const config = authConfig();
  const query = new URL(request.url).searchParams;
  const next = safeReturnPath(query.get('next'));
  const origin = config?.origin || new URL(request.url).origin;
  const client = requestAuth(request).client;
  const code = query.get('code');
  if (client && code && code.length <= 4000 && !query.has('error')) {
    try {
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (!error && data.user?.email_confirmed_at && !data.user.is_anonymous) {
        return Response.redirect(new URL(next, origin), 303);
      }
      await client.auth.signOut({ scope: 'local' });
    } catch { /* An absent, reused, or mismatched PKCE verifier fails closed. */ }
  }
  const errorURL = new URL('/login', origin);
  errorURL.searchParams.set('next', next);
  errorURL.searchParams.set('error', query.get('error') === 'access_denied' ? 'cancelled' : 'failed');
  return Response.redirect(errorURL, 303);
});
