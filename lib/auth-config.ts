export function authConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Account service is not configured');
  return {url, key};
}

export function siteOrigin() {
  const value = process.env.SITE_URL;
  if (!value) throw new Error('Site address is not configured');
  const url = new URL(value);
  if (url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('HTTPS is required');
  return url.origin;
}

export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const url = new URL(value, 'https://aquaraa.local');
    if (url.origin !== 'https://aquaraa.local' || /^\/(auth|login|forgot-password|set-password)(\/|$)/.test(url.pathname)) return '/';
    return url.pathname + url.search;
  } catch { return '/'; }
}

export function validOrigin(request: Request) {
  return request.headers.get('origin') === siteOrigin();
}
