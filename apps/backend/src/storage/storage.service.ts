import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

// Object storage abstraction over S3/MinIO/R2 (Architecture.docx §18-19).
// Never store PDFs/images in PostgreSQL — only the storageKey lives there.
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>("s3.bucket")!;
    this.client = new S3Client({
      endpoint: this.config.get<string>("s3.endpoint"),
      region: this.config.get<string>("s3.region"),
      forcePathStyle: this.config.get<boolean>("s3.forcePathStyle"),
      credentials: {
        accessKeyId: this.config.get<string>("s3.accessKey")!,
        secretAccessKey: this.config.get<string>("s3.secretKey")!,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created object storage bucket "${this.bucket}"`);
      } catch (error) {
        this.logger.warn(`Could not verify/create bucket "${this.bucket}": ${(error as Error).message}`);
      }
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return key;
  }

  // Never expose bucket objects publicly — always a short-lived signed URL.
  async getSignedDownloadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
