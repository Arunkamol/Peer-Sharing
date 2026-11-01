/** Only return to a page on this site, never another origin or an auth endpoint. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || value.length > 2000 || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x1f]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://peer.invalid');
    if (url.origin !== 'https://peer.invalid' || /^\/(?:auth(?:\/|$)|login(?:\/|$)|signin-with-chatgpt|signout-with-chatgpt|callback)/.test(url.pathname)) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}

export function signInPath(next = '/'): string {
  return '/login?next=' + encodeURIComponent(safeReturnPath(next));
}
