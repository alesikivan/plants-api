import { CookieOptions } from 'express';

// Optional prefix for auth cookie names (e.g. "stage_" on staging), so a staging site on a
// subdomain doesn't clash with production cookies set on the parent domain. Empty = prod/local.
// Read lazily: .env is loaded by ConfigModule after this module is imported.
const cookiePrefix = () => process.env.AUTH_COOKIE_PREFIX || '';
export const accessCookieName = () => `${cookiePrefix()}accessToken`;
export const refreshCookieName = () => `${cookiePrefix()}refreshToken`;

export function getAuthCookieOptions(
  type: 'access' | 'refresh',
): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const isSecure = isProd || process.env.FORCE_SECURE === 'true';

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
    path: '/',
    maxAge:
      type === 'access'
        ? 15 * 60 * 1000 // 15 minutes
        : 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

export function getClearCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const isSecure = isProd || process.env.FORCE_SECURE === 'true';

  // Must match the options used when setting the cookie
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    domain: isProd ? process.env.COOKIE_DOMAIN : undefined,
    path: '/',
  };
}
