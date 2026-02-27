// file: src/utils/excel-response.utils.ts

export type ExcelFileLink = {
  url: string;
  key: string | null;
};

export type ExcelDownloadResponseData = {
  fileName: string;
  fileUrl: ExcelFileLink;
  version: number | null;
  lastUpdated: string;
  downloadUrl: ExcelFileLink;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function deriveKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);

    // Path-style public URL: /<bucket>/<key>
    if (segments.length >= 2) {
      return decodeURIComponent(segments.slice(1).join("/"));
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeFileLink(fileUrl: unknown, key?: unknown): ExcelFileLink {
  const fallbackKey = asString(key);

  if (fileUrl && typeof fileUrl === "object") {
    const value = fileUrl as Record<string, unknown>;
    const url = asString(value.url) || "";
    const resolvedKey =
      asString(value.key) || fallbackKey || (url ? deriveKeyFromUrl(url) : null);

    return { url, key: resolvedKey };
  }

  const url = asString(fileUrl) || "";
  const resolvedKey = fallbackKey || (url ? deriveKeyFromUrl(url) : null);

  return { url, key: resolvedKey };
}

function normalizeVersion(version: unknown): number | null {
  if (typeof version === "number" && Number.isFinite(version)) {
    return version;
  }

  if (typeof version === "string") {
    const parsed = Number(version);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeTimestamp(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const asDateString = asString(value);
  if (asDateString) {
    return asDateString;
  }

  return new Date().toISOString();
}

export function buildExcelDownloadResponse(payload: {
  fileName?: unknown;
  fileUrl?: unknown;
  key?: unknown;
  version?: unknown;
  lastUpdated?: unknown;
}): ExcelDownloadResponseData {
  const fileLink = normalizeFileLink(payload.fileUrl, payload.key);

  return {
    fileName: asString(payload.fileName) || "",
    fileUrl: fileLink,
    version: normalizeVersion(payload.version),
    lastUpdated: normalizeTimestamp(payload.lastUpdated),
    downloadUrl: fileLink,
  };
}
