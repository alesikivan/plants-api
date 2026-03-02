import { CookieOptions } from 'express';

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
