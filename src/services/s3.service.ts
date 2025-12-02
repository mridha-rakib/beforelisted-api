// file: src/services/s3.service.ts
// ✅ Hetzner S3 Service for file uploads

import { env } from "@/env";
import { S3Client } from "@aws-sdk/client-s3";

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor() {
    this.bucket = env.HETZNER_BUCKET_NAME;
    this.endpoint = env.HETZNER_S3_ENDPOINT;
    this.s3Client = new S3Client({
      region: env.HETZNER_REGION,
      endpoint: this.endpoint,
      credentials: {},
    });
  }
}
