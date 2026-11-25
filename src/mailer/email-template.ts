// Transactional email layout (redesign, matches the site's Claude-like look).
// Email clients need table layout + inline styles; web fonts are unreliable, so the
// heading falls back to Georgia, which is close to the site's serif.

export interface EmailContent {
  lang: string;
  /** Hidden preview line shown by mail clients next to the subject */
  preheader: string;
  heading: string;
  intro: string;
  buttonText: string;
  link: string;
  linkText: string;
  validity: string;
  ignoreText: string;
  footer: string;
  /** Absolute URL of the site, used for the footer link */
  siteUrl: string;
  /** Logo image source (a cid: reference to an inline attachment); omitted when null */
  logoSrc: string | null;
}

const COLORS = {
  page: '#f7f7f5',
  card: '#ffffff',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#9a9a9a',
  border: '#ececea',
  brand: '#8aa145', // hsl(75 40% 45%) — the site's primary
  brandText: '#ffffff',
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function renderEmail(content: EmailContent): string {
  const e = {
    preheader: escapeHtml(content.preheader),
    heading: escapeHtml(content.heading),
    intro: escapeHtml(content.intro),
    buttonText: escapeHtml(content.buttonText),
    link: escapeHtml(content.link),
    linkText: escapeHtml(content.linkText),
    validity: escapeHtml(content.validity),
    ignoreText: escapeHtml(content.ignoreText),
    footer: escapeHtml(content.footer),
    siteUrl: escapeHtml(content.siteUrl.replace(/\/$/, '')),
  };
  const sans = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;
  const serif = `Georgia, 'Times New Roman', serif`;

  return `<!doctype html>
<html lang="${escapeHtml(content.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${e.heading}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .ps-page { background: #141414 !important; }
    .ps-card { background: #1f1f1f !important; border-color: #2c2c2c !important; }
    .ps-text { color: #f2f2f2 !important; }
    .ps-muted { color: #a3a3a3 !important; }
    .ps-faint { color: #7a7a7a !important; }
    .ps-rule { border-color: #2c2c2c !important; }
  }
  @media (max-width: 520px) {
    .ps-card-pad { padding: 32px 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};" class="ps-page">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="ps-page" style="background:${COLORS.page};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        ${
          content.logoSrc
            ? `<tr>
          <td align="center" style="padding-bottom:24px;">
            <a href="${e.siteUrl}" style="text-decoration:none;">
              <img src="${escapeHtml(content.logoSrc)}" width="40" height="40" alt="PlantSheep"
                   style="display:block;border:0;border-radius:10px;background:#ffffff;">
            </a>
          </td>
        </tr>`
            : ''
        }
        <tr>
          <td class="ps-card ps-card-pad" style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:20px;padding:40px 40px;">
            <h1 class="ps-text" style="margin:0 0 12px;font-family:${serif};font-size:26px;line-height:1.25;font-weight:normal;color:${COLORS.text};">${e.heading}</h1>
            <p class="ps-muted" style="margin:0 0 28px;font-family:${sans};font-size:16px;line-height:1.6;color:${COLORS.muted};">${e.intro}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:10px;background:${COLORS.brand};">
                  <a href="${e.link}" target="_blank"
                     style="display:inline-block;padding:12px 22px;font-family:${sans};font-size:15px;font-weight:600;line-height:1;color:${COLORS.brandText};text-decoration:none;border-radius:10px;">${e.buttonText}</a>
                </td>
              </tr>
            </table>
            <p class="ps-faint" style="margin:28px 0 0;font-family:${sans};font-size:13px;line-height:1.6;color:${COLORS.faint};">${e.validity}</p>
            <hr class="ps-rule" style="border:0;border-top:1px solid ${COLORS.border};margin:24px 0;">
            <p class="ps-faint" style="margin:0 0 6px;font-family:${sans};font-size:13px;line-height:1.6;color:${COLORS.faint};">${e.linkText}</p>
            <p style="margin:0;font-family:${sans};font-size:13px;line-height:1.5;word-break:break-all;">
              <a href="${e.link}" class="ps-muted" style="color:${COLORS.muted};text-decoration:underline;">${e.link}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 8px 0;">
            <p class="ps-faint" style="margin:0 0 6px;font-family:${sans};font-size:12px;line-height:1.6;color:${COLORS.faint};">${e.ignoreText}</p>
            <p class="ps-faint" style="margin:0;font-family:${sans};font-size:12px;line-height:1.6;color:${COLORS.faint};">
              <a href="${e.siteUrl}" class="ps-faint" style="color:${COLORS.faint};text-decoration:none;">${e.footer}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
