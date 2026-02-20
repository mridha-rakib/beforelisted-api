// file: src/services/s3.service.ts

import { logger } from "@/middlewares/pino-logger";
import { BadRequestException } from "@/utils/app-error.utils";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3 Service
 * Handles all interactions with Hetzner S3 storage
 * Uploads, deletes, and retrieves signed URLs for files
 */
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor() {
    this.bucket = process.env.HETZNER_BUCKET_NAME || "before-listed-uploads";
    this.endpoint = this.normalizeEndpoint(
      process.env.HETZNER_S3_ENDPOINT ||
        "https://hel1.your-objectstorage.com"
    );

    this.s3Client = new S3Client({
      region: process.env.HETZNER_REGION || "eu-central",
      endpoint: this.endpoint,
      // Path-style avoids invalid DNS hostnames when env endpoint is bucket-prefixed.
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.HETZNER_ACCESS_KEY!,
        secretAccessKey: process.env.HETZNER_SECRET_KEY!,
      },
    });
  }

  /**
   * Upload file to S3
   * @param fileBuffer - File content as Buffer
   * @param fileName - Name to store file as
   * @param mimeType - File MIME type
   * @param folder - Folder path in bucket
   * @returns { url, key }
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string
  ): Promise<{ url: string; key: string }> {
    const key = `${folder}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: "public-read",
      CacheControl: "max-age=31536000", // 1 year cache
    });

    try {
      await this.s3Client.send(command);
      const url = this.getPublicUrl(key);

      logger.info({ fileName, folder, key }, "File uploaded to S3");
      return { url, key };
    } catch (error) {
      logger.error({ error, fileName, folder }, "S3 upload failed");
      throw new BadRequestException("Failed to upload file to storage");
    }
  }

  /**
   * Upload file to a known S3 object key (overwrite).
   */
  async uploadFileToKey(
    fileBuffer: Buffer,
    key: string,
    mimeType: string
  ): Promise<{ url: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: "public-read",
      CacheControl: "no-store",
    });

    try {
      await this.s3Client.send(command);
      const url = this.getPublicUrl(key);
      logger.info({ key }, "File uploaded to S3 by key");
      return { url, key };
    } catch (error) {
      logger.error({ error, key }, "S3 upload by key failed");
      throw new BadRequestException("Failed to upload file to storage");
    }
  }

  /**
   * Delete file from S3
   * @param key - File key to delete
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      logger.info({ key }, "File deleted from S3");
    } catch (error) {
      logger.error({ error, key }, "S3 delete failed");
      throw new BadRequestException("Failed to delete file from storage");
    }
  }

  /**
   * Get signed URL for private file access
   * @param key - File key
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      logger.info({ key, expiresIn }, "Signed URL generated");
      return url;
    } catch (error) {
      logger.error({ error, key }, "Failed to generate signed URL");
      throw new BadRequestException("Failed to generate signed URL");
    }
  }

  /**
   * Download file content from S3 as Buffer
   * @param key - File key
   */
  async getFileBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      if (!response.Body) {
        throw new BadRequestException("File body is empty");
      }

      const body = response.Body as {
        transformToByteArray?: () => Promise<Uint8Array>;
        [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>;
      };

      if (typeof body.transformToByteArray === "function") {
        const byteArray = await body.transformToByteArray();
        return Buffer.from(byteArray);
      }

      if (typeof body[Symbol.asyncIterator] === "function") {
        const chunks: Buffer[] = [];
        for await (const chunk of body as AsyncIterable<Uint8Array>) {
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }

      throw new BadRequestException("Unsupported file stream format");
    } catch (error) {
      logger.error({ error, key }, "Failed to download file from S3");
      throw new BadRequestException("Failed to download file from storage");
    }
  }

  /**
   * Get public URL for file
   * @param key - File key
   * @returns Public URL
   */
  getPublicUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${this.encodeObjectKey(key)}`;
  }

  /**
   * Extract object key from a public URL.
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      const pathname = decodeURIComponent(parsed.pathname || "").replace(
        /^\/+/,
        ""
      );
      const bucketLower = this.bucket.toLowerCase();
      const pathLower = pathname.toLowerCase();

      // Path-style URL: /<bucket>/<key>
      const bucketPrefix = `${bucketLower}/`;
      if (pathLower.startsWith(bucketPrefix)) {
        const key = pathname.slice(this.bucket.length + 1);
        return key.length > 0 ? key : null;
      }

      // Virtual-host style URL: https://<bucket>.<endpoint>/<key>
      const hostLower = parsed.hostname.toLowerCase();
      if (
        hostLower === bucketLower ||
        hostLower.startsWith(`${bucketLower}.`)
      ) {
        return pathname.length > 0 ? pathname : null;
      }

      // Fallback: accept bare key paths when host already points at object storage endpoint.
      const endpointHost = this.safeHostname(this.endpoint);
      if (endpointHost && hostLower === endpointHost.toLowerCase()) {
        return pathname.length > 0 ? pathname : null;
      }

      return null;
    } catch (error) {
      logger.warn({ error, url }, "Failed to parse S3 key from URL");
      return null;
    }
  }

  private encodeObjectKey(key: string): string {
    return key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  private safeHostname(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  /**
   * Normalize endpoint input so SDK always receives a base object-storage endpoint.
   * Supports env values with/without protocol and with accidental bucket prefix/path.
   */
  private normalizeEndpoint(rawEndpoint: string): string {
    const trimmed = rawEndpoint.trim();
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    try {
      const parsed = new URL(withProtocol);
      parsed.hash = "";
      parsed.search = "";

      const bucketPrefix = `${this.bucket.toLowerCase()}.`;
      const hostname = parsed.hostname.toLowerCase();
      if (hostname.startsWith(bucketPrefix)) {
        parsed.hostname = parsed.hostname.slice(this.bucket.length + 1);
      }

      // Remove accidental "/<bucket>" suffix in endpoint env values.
      const normalizedPath = parsed.pathname.replace(/^\/+|\/+$/g, "");
      if (
        normalizedPath.length === 0 ||
        normalizedPath.toLowerCase() === this.bucket.toLowerCase()
      ) {
        parsed.pathname = "";
      } else {
        parsed.pathname = `/${normalizedPath}`;
      }

      return parsed.toString().replace(/\/+$/, "");
    } catch (error) {
      logger.warn(
        { rawEndpoint, error },
        "Invalid HETZNER_S3_ENDPOINT provided, using default endpoint"
      );
      return "https://hel1.your-objectstorage.com";
    }
  }
}
