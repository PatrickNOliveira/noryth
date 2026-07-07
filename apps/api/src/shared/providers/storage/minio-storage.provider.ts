import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { EnvironmentVariables } from '@shared/config/env.validation';
import {
  StorageProvider,
  UploadedFile,
  UploadFileParams,
} from './storage.provider';

/**
 * MinIO adapter for {@link StorageProvider}. This is the ONLY file that imports
 * the MinIO SDK — domain code stays unaware of it.
 *
 * The bucket is created (with a public-read policy) on first use so uploaded
 * cover images are reachable through their public URL in this initial story.
 */
@Injectable()
export class MinioStorageProvider implements StorageProvider {
  private readonly logger = new Logger(MinioStorageProvider.name);
  private readonly client: Client;
  private readonly bucket: string;
  private readonly useSSL: boolean;
  private readonly endpoint: string;
  private readonly port: number;
  private readonly publicBaseUrl?: string;
  private bucketReady = false;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.endpoint = config.get('MINIO_ENDPOINT', { infer: true });
    this.port = config.get('MINIO_PORT', { infer: true });
    this.useSSL = config.get('MINIO_USE_SSL', { infer: true });
    this.bucket = config.get('MINIO_BUCKET', { infer: true });
    this.publicBaseUrl = config.get('MINIO_PUBLIC_URL', { infer: true }) || undefined;

    this.client = new Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey: config.get('MINIO_ACCESS_KEY', { infer: true }),
      secretKey: config.get('MINIO_SECRET_KEY', { infer: true }),
    });
  }

  async upload(params: UploadFileParams): Promise<UploadedFile> {
    await this.ensureBucket();
    try {
      await this.client.putObject(
        this.bucket,
        params.path,
        params.buffer,
        params.buffer.length,
        { 'Content-Type': params.contentType },
      );
    } catch (error) {
      this.logger.error(`Failed to upload "${params.path}"`, error as Error);
      throw new InternalServerErrorException('Falha ao enviar o arquivo');
    }
    return { path: params.path, url: this.getPublicUrl(params.path) };
  }

  async delete(path: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, path);
    } catch (error) {
      this.logger.warn(`Failed to delete "${path}": ${(error as Error).message}`);
    }
  }

  getPublicUrl(path: string): string {
    const base =
      this.publicBaseUrl ??
      `${this.useSSL ? 'https' : 'http'}://${this.endpoint}:${this.port}`;
    return `${base.replace(/\/$/, '')}/${this.bucket}/${path}`;
  }

  /** Creates the bucket and grants public read on first use. */
  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      await this.client.setBucketPolicy(
        this.bucket,
        JSON.stringify(publicReadPolicy(this.bucket)),
      );
      this.logger.log(`Created MinIO bucket "${this.bucket}" (public read)`);
    }
    this.bucketReady = true;
  }
}

function publicReadPolicy(bucket: string) {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  };
}
