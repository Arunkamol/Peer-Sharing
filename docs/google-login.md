# Google sign-in activation

The Google login implementation is deployed alongside the original Sites-managed
ChatGPT login. Google is **not active** until the project owner configures the
provider in Supabase. `/api/auth/options` reads Supabase's provider readiness, with
a 30-second server cache. Until enabled, the login screen shows Google as coming
soon and keeps ChatGPT available. No fake login is performed.

## Owner setup

1. In Google Auth Platform, create a web OAuth client for **Peer Sharing**.
   Configure the consent screen with the app's name, support contact and the
   basic `openid`, email and profile scopes. Do not request Drive, Gmail or other
   unrelated access. Use an External audience for general Google accounts; an
   Internal audience only works for the selected Google Workspace organization.
2. Add this authorized JavaScript origin:
   `https://peer-sharing-campus.contact410431.chatgpt.site`
3. Add this authorized redirect URI:
   `https://kaljfnkanscjtdmakkzq.supabase.co/auth/v1/callback`
4. In the Peer Sharing Supabase project, Authentication → Sign In / Providers →
   Google, enter the Google OAuth client ID and secret, enable Google, and save.
   Keep nonce checks and email verification enabled. Enter the secret directly in
   Supabase; never put it in GitHub, a browser bundle, or a chat message.
5. In Authentication → URL Configuration, set the Site URL to
   `https://peer-sharing-campus.contact410431.chatgpt.site` and add these allowed
   redirect URLs (the second permits the app's encoded return-path query):
   - `https://peer-sharing-campus.contact410431.chatgpt.site/auth/google/callback`
   - `https://peer-sharing-campus.contact410431.chatgpt.site/auth/google/callback?**`
6. If the Google consent screen is still in Testing, add the Google accounts that
   will test the app. Publish the OAuth app for the intended audience when ready;
   Google may require consent-screen branding verification.
7. Wait up to 30 seconds, reopen `/login`, and test with a Google account. Verify
   profile save, returning after a reload, a private booking/chat, and sign-out.

Google client configuration is held by Supabase. The existing Sites deployment
only needs these non-secret runtime values, already configured:
`PEER_SUPABASE_URL`, `PEER_SUPABASE_PUBLISHABLE_KEY`, `PEER_SITE_ORIGIN`.

## Identity and session behavior

- Existing ChatGPT account IDs and their records remain unchanged.
- Google accounts use the verified Supabase user ID prefixed with `supabase:`.
  The server calls Supabase Auth `getUser()` on authenticated requests; it never
  authorizes an ID, email or user metadata supplied by a browser.
- Google and ChatGPT accounts are separate, even when their emails match. There
  is no automatic email-based linking or data transfer. Users should return with
  the same provider to access the same profile and bookings.
- Supabase's official SSR SDK handles OAuth PKCE and token refresh. Tokens and
  the verifier are stored in Secure, HttpOnly, SameSite=Lax cookies, never in
  localStorage. Every identity-aware API response is private and non-cacheable.
- Authenticated reads and writes use the same signed server-to-server backend.
  Google users do not receive direct access to the private `peer` schema or the
  gateway RPC.
- Sign-out is a same-origin POST. Switching to ChatGPT clears the Supabase
  session before navigating to Sites' normal sign-in endpoint. A normal sign-out
  clears both login methods if both are present.
- Google callback errors and cancellation have friendly messages. Return paths
  are restricted to local, non-auth pages; raw provider errors/tokens are never
  rendered or logged.

## Verification

Run `node --test scripts/auth.test.mjs` and
`node node_modules/typescript/bin/tsc --noEmit --incremental false`.

The tests use the official Supabase SDK with mocked Auth responses. They check
forged-cookie rejection, server-verified identity, unverified-user rejection,
preserved ChatGPT identities, PKCE cookie attributes, refreshed-cookie delivery,
safe return paths and deletion of chunked session cookies. They do not prove a
real Google OAuth consent round trip. That requires the owner setup above.

References:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://learn.chatgpt.com/docs/sites/data-and-connections
