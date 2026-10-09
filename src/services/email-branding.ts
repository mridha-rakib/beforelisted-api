export const DEFAULT_EMAIL_LOGO_URL
  = "cid:beforelisted-email-logo.png";
export const EMAIL_LOGO_CONTENT_ID = "cid:beforelisted-email-logo.png";
// Keep every BeforeListed-owned link in outbound email on the production site.
export const EMAIL_SITE_URL = "https://beforelisted.com";
const LEGACY_EMAIL_SITE_URL_PATTERN
  = /https?:\/\/rental-pennymore-frontend\.vercel\.app(?=\/|["'<\s]|$)/gi;

export function emailSiteUrl(path: string = "/"): string {
  return `${EMAIL_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function replaceLegacyEmailSiteUrls(html: string): string {
  return html.replace(LEGACY_EMAIL_SITE_URL_PATTERN, EMAIL_SITE_URL);
}

function stripWrappingQuotes(value: string): string {
  return value
    .trim()
    .replace(/^(["']|%22|%27)+/, "")
    .replace(/(["']|%22|%27)+$/, "");
}

export function normalizeEmailLogoUrl(logoUrl?: string): string {
  const candidate = stripWrappingQuotes(logoUrl || DEFAULT_EMAIL_LOGO_URL);

  if (candidate.startsWith("cid:")) {
    return EMAIL_LOGO_CONTENT_ID;
  }

  try {
    const parsedUrl = new URL(candidate);
    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      return DEFAULT_EMAIL_LOGO_URL;
    }

    if (parsedUrl.hostname.includes("postimg.cc")) {
      return DEFAULT_EMAIL_LOGO_URL;
    }

    return parsedUrl.toString();
  }
  catch {
    return DEFAULT_EMAIL_LOGO_URL;
  }
}

export function renderEmailLogo(
  logoUrl?: string,
  options: {
    alt?: string;
    className?: string;
    width?: number;
    marginBottom?: number;
  } = {},
): string {
  const {
    alt = "BeforeListed Logo",
    className = "logo",
    width = 190,
    marginBottom = 20,
  } = options;
  normalizeEmailLogoUrl(logoUrl);
  const src = EMAIL_LOGO_CONTENT_ID;

  return `<a href="${emailSiteUrl()}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;"><img src="${src}" width="${width}" alt="${alt}" class="${className}" border="0" style="display:block;border:0;outline:none;text-decoration:none;width:${width}px;max-width:100%;height:auto;margin:0 auto ${marginBottom}px auto;-ms-interpolation-mode:bicubic;"></a>`;
}
