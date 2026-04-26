export const DEFAULT_EMAIL_LOGO_URL =
  "https://i.postimg.cc/wB4Zgqmy/Logo-8.jpg";

const stripWrappingQuotes = (value: string): string =>
  value
    .trim()
    .replace(/^(["']|%22|%27)+/i, "")
    .replace(/(["']|%22|%27)+$/i, "");

export function normalizeEmailLogoUrl(logoUrl?: string): string {
  const candidate = stripWrappingQuotes(logoUrl || DEFAULT_EMAIL_LOGO_URL);

  try {
    const parsedUrl = new URL(candidate);
    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
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
    width = 150,
    marginBottom = 20,
  } = options;
  const src = normalizeEmailLogoUrl(logoUrl);

  return `<img src="${src}" width="${width}" alt="${alt}" class="${className}" border="0" style="display:block;border:0;outline:none;text-decoration:none;width:${width}px;max-width:${width}px;height:auto;margin:0 auto ${marginBottom}px auto;-ms-interpolation-mode:bicubic;">`;
}
