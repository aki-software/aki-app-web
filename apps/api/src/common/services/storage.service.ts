import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private s3Client: S3Client | null = null;
  private bucket: string;
  private endpoint: string | undefined;

  constructor(private configService: ConfigService) {
    this.endpoint = this.configService.get<string>('S3_ENDPOINT');
    this.bucket = this.configService.get<string>('S3_BUCKET', 'akit-reports');

    const accessKey = this.configService.get<string>('S3_ACCESS_KEY');
    const secretKey = this.configService.get<string>('S3_SECRET_KEY');

    if (this.endpoint && accessKey && secretKey) {
      this.s3Client = new S3Client({
        endpoint: this.endpoint,
        region: this.configService.get<string>('S3_REGION', 'auto'),
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
        forcePathStyle: true,
      });
    }
  }

  isConfigured(): boolean {
    return this.s3Client !== null;
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string = 'application/pdf',
  ): Promise<string | null> {
    if (!this.s3Client) {
      console.warn('⚠️ S3 Storage no está configurado. El archivo no se subirá.');
      return null;
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);
      return `${this.endpoint}/${this.bucket}/${fileName}`;
    } catch (error) {
      console.error('❌ Error uploading file to S3:', error);
      throw new InternalServerErrorException('Error al subir el archivo al almacenamiento.');
    }
  }
}
