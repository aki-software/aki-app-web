import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { StorageAdapter } from '../adapters/storage.adapter.js';

@Injectable()
export class StorageService implements StorageAdapter {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private readonly accessKey: string | undefined;
  private readonly secretKey: string | undefined;
  private bucket: string;
  private endpoint: string | undefined;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.endpoint = this.configService.get<string>('S3_ENDPOINT');
    this.bucket = this.configService.get<string>('S3_BUCKET', 'akit-reports');
    this.region = this.configService.get<string>('S3_REGION', 'auto');
    this.accessKey = this.configService.get<string>('S3_ACCESS_KEY');
    this.secretKey = this.configService.get<string>('S3_SECRET_KEY');
  }

  isConfigured(): boolean {
    return Boolean(this.endpoint && this.accessKey && this.secretKey);
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string = 'application/pdf',
  ): Promise<string | null> {
    const s3Client = await this.getS3Client();
    if (!s3Client) {
      this.logger.warn(
        'S3 Storage no está configurado. El archivo no se subirá.',
      );
      return null;
    }

    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read',
      });

      await s3Client.send(command);
      return `${this.endpoint}/${this.bucket}/${fileName}`;
    } catch (error) {
      this.logger.error(
        'Error uploading file to S3',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Error al subir el archivo al almacenamiento.',
      );
    }
  }

  private async getS3Client(): Promise<S3Client | null> {
    if (!this.isConfigured()) {
      return null;
    }

    if (!this.s3Client) {
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.s3Client = new S3Client({
        endpoint: this.endpoint,
        region: this.region,
        credentials: {
          accessKeyId: this.accessKey!,
          secretAccessKey: this.secretKey!,
        },
        forcePathStyle: true,
      });
    }

    return this.s3Client;
  }
}
