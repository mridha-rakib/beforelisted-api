// file: src/services/s3.service.ts
// ✅ Hetzner S3 Service for file uploads

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
    this.endpoint =
      process.env.HETZNER_S3_ENDPOINT ||
      "https://before-listed-uploads.hel1.your-objectstorage.com";

    this.s3Client = new S3Client({
      region: process.env.HETZNER_REGION || "eu-central",
      endpoint: this.endpoint,
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
      const url = `${this.endpoint}/${this.bucket}/${key}`;

      logger.info({ fileName, folder, key }, "File uploaded to S3");
      return { url, key };
    } catch (error) {
      logger.error({ error, fileName, folder }, "S3 upload failed");
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
   * Get public URL for file
   * @param key - File key
   * @returns Public URL
   */
  getPublicUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${key}`;
  }
}
