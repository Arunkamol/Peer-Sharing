import { authConfig, requestAuth, withAuth } from '@/lib/supabase-auth';
import { safeReturnPath } from '@/lib/auth-paths';
export const dynamic = 'force-dynamic';
export const POST = withAuth(async request => {
  const origin = authConfig()?.origin || new URL(request.url).origin;
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ error: 'Please sign out from Peer Sharing.' }, { status: 403 });
  }
  const auth = requestAuth(request);
  try { if (auth.client && auth.hasSession) await auth.client.auth.signOut({ scope: 'local' }); } catch { /* Still remove browser credentials. */ }
  auth.clearSessionCookies();
  const form = await request.formData();
  if (form.get('intent') === 'chatgpt') {
    const next = safeReturnPath(String(form.get('next') || '/'));
    return Response.redirect(new URL('/signin-with-chatgpt?return_to=' + encodeURIComponent(next), origin), 303);
  }
  // Sign out both identities, so an older ChatGPT session cannot reappear.
  const path = request.headers.has('oai-authenticated-user-id') ? '/signout-with-chatgpt?return_to=%2F' : '/';
  return Response.redirect(new URL(path, origin), 303);
});
