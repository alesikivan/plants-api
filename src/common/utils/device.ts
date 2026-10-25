export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface DeviceInfo {
  userAgent: string;
  os: string;
  browser: string;
  deviceType: DeviceType;
}

// Lightweight User-Agent parser: we only need OS / browser family / device type for stats
export function parseUserAgent(userAgent?: string | null): DeviceInfo | null {
  const ua = (userAgent || '').trim();
  if (!ua) return null;

  let os = 'Other';
  let deviceType: DeviceType = 'unknown';

  if (/iPad/.test(ua)) {
    os = 'iOS';
    deviceType = 'tablet';
  } else if (/iPhone|iPod/.test(ua)) {
    os = 'iOS';
    deviceType = 'mobile';
  } else if (/Android/.test(ua)) {
    os = 'Android';
    deviceType = /Mobile/.test(ua) ? 'mobile' : 'tablet';
  } else if (/Windows/.test(ua)) {
    os = 'Windows';
    deviceType = 'desktop';
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = 'macOS';
    deviceType = 'desktop';
  } else if (/CrOS/.test(ua)) {
    os = 'ChromeOS';
    deviceType = 'desktop';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
    deviceType = 'desktop';
  }

  let browser = 'Other';
  if (/YaBrowser|YaApp/.test(ua)) browser = 'Yandex';
  else if (/Telegram/.test(ua)) browser = 'Telegram';
  else if (/GSA\//.test(ua)) browser = 'Google App';
  else if (/Edg(e|A|iOS)?\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/Firefox|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Chrome|CriOS/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua)) browser = 'Safari';

  return { userAgent: ua.slice(0, 512), os, browser, deviceType };
}
