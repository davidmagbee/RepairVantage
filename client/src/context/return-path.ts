// Restrict return intents to known app routes after URL parsing normalizes slashes.
export function returnPath(value: unknown) {
  if (typeof value === 'string' && value.startsWith('/')) {
    try {
      const url = new URL(value, window.location.origin);
      const allowed = url.pathname === '/invite' || /^\/projects(?:\/|$)/.test(url.pathname);
      if (url.origin === window.location.origin && allowed) return url.pathname;
    } catch {
      // Invalid return paths go to the private project list.
    }
  }
  return '/projects';
}
