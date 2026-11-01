import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestAuth } from '../lib/auth-session.ts';
import { safeReturnPath } from '../lib/auth-paths.ts';

const config = { url: 'https://example.supabase.co', key: 'sb_publishable_test', origin: 'https://peer.example' };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function sessionCookie({ expired = false } = {}) {
  const exp = Math.floor(Date.now() / 1000) + (expired ? -60 : 3600);
  const access_token = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: 'client-claimed-id', exp, aud: 'authenticated' }) + '.test-signature';
  return 'peer-sb-auth=base64-' + encode({ access_token, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: exp, expires_in: 3600, user: { id: 'forged-cookie-user' } });
}
const verifiedUser = { id: '673fe705-8b24-4783-a433-3916b1f25da3', email: 'test@example.invalid', email_confirmed_at: '2026-01-01T00:00:00Z', identities: [{ provider: 'google' }], app_metadata: { provider: 'google' }, user_metadata: { owner: 'another-owner' } };

test('return destinations reject external URLs, reserved routes, and backslash redirects', () => {
  for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', '/auth/google', '/login', '/x/../signin-with-chatgpt', '/\n/evil.example']) assert.equal(safeReturnPath(path), '/');
  assert.equal(safeReturnPath('/?view=chat&item=123'), '/?view=chat&item=123');
});

test('anonymous and existing Sites identities do not call Supabase', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network'); });
  assert.equal(await createRequestAuth(new Request(config.origin), config).getActor(), null);
  assert.equal(await createRequestAuth(new Request(config.origin, { headers: { 'oai-authenticated-user-id': 'existing-site-id' } }), config).getActor(), 'existing-site-id');
});

test('a cookie claiming an identity cannot authenticate when Auth rejects it', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ msg: 'Invalid JWT', code: 'bad_jwt' }, { status: 401 }); });
  const auth = createRequestAuth(new Request(config.origin, { headers: { cookie: sessionCookie(), 'oai-authenticated-user-id': 'other-account' } }), config);
  assert.equal(await auth.getActor(), null);
  assert.ok(calls > 0);
});

test('authorization uses the user returned by Auth, not cookie data or user_metadata', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async url => { assert.match(String(url), /\/auth\/v1\/user/); calls++; return Response.json(verifiedUser); });
  const auth = createRequestAuth(new Request(config.origin, { headers: { cookie: sessionCookie() } }), config);
  assert.equal(await auth.getActor(), 'supabase:' + verifiedUser.id);
  assert.equal(await auth.getActor(), 'supabase:' + verifiedUser.id);
  assert.equal(calls, 1);
});

test('unverified and anonymous Auth accounts are rejected', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ...verifiedUser, email_confirmed_at: null }));
  assert.equal(await createRequestAuth(new Request(config.origin, { headers: { cookie: sessionCookie() } }), config).getActor(), null);
});

test('Google OAuth uses PKCE and emits secure HttpOnly verifier cookies with no caching', async () => {
  const auth = createRequestAuth(new Request(config.origin), config);
  const { data, error } = await auth.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: config.origin + '/auth/google/callback', skipBrowserRedirect: true } });
  assert.equal(error, null);
  const url = new URL(data.url);
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.ok(url.searchParams.get('code_challenge'));
  const response = auth.finish(Response.redirect(data.url, 303));
  const cookies = response.headers.getSetCookie().join(';');
  assert.match(cookies, /peer-sb-auth-code-verifier=/);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax']) assert.ok(cookies.includes(flag));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('refresh cookies are propagated to the API response', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/token?grant_type=refresh_token')) {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      return Response.json({ access_token: encode({ alg: 'HS256' }) + '.' + encode({ sub: verifiedUser.id, exp }) + '.new-signature', refresh_token: 'new-refresh', expires_in: 3600, token_type: 'bearer', user: verifiedUser });
    }
    return Response.json(verifiedUser);
  });
  const auth = createRequestAuth(new Request(config.origin, { headers: { cookie: sessionCookie({ expired: true }) } }), config);
  assert.equal(await auth.getActor(), 'supabase:' + verifiedUser.id);
  const response = auth.finish(Response.json({ ok: true }));
  assert.ok(response.headers.getSetCookie().some(c => c.startsWith('peer-sb-auth=')));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('sign-out deletes all token chunks without clearing other site cookies', () => {
  const auth = createRequestAuth(new Request(config.origin, { headers: { cookie: 'peer-sb-auth.0=x; peer-sb-auth.1=y; peer-sb-auth-code-verifier=z; preference=keep' } }), config);
  auth.clearSessionCookies();
  const cookies = auth.finish(Response.json({ ok: true })).headers.getSetCookie();
  assert.equal(cookies.length, 3);
  assert.ok(cookies.every(c => c.includes('Max-Age=0') && !c.startsWith('preference=')));
});
