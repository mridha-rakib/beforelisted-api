export const DEFAULT_EMAIL_LOGO_URL =
  "cid:beforelisted-email-logo.png";
export const EMAIL_LOGO_CONTENT_ID = "cid:beforelisted-email-logo.png";

const stripWrappingQuotes = (value: string): string =>
  value
    .trim()
    .replace(/^(["']|%22|%27)+/i, "")
    .replace(/(["']|%22|%27)+$/i, "");

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
  } catch {
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

  return `<img src="${src}" width="${width}" alt="${alt}" class="${className}" border="0" style="display:block;border:0;outline:none;text-decoration:none;width:${width}px;max-width:100%;height:auto;margin:0 auto ${marginBottom}px auto;-ms-interpolation-mode:bicubic;">`;
}
