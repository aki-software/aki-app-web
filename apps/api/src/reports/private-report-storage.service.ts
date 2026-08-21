import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export interface PrivateReportObject {
  contentHash: string;
  version: number;
}
export interface PrivateReportUpload {
  objectKey: string;
  etag?: string;
  versionId?: string;
}
export class ImmutableReportObjectCollisionError extends Error {
  readonly code = 'IMMUTABLE_REPORT_OBJECT_COLLISION';
  constructor() {
    super('Private report object already exists.');
  }
}

@Injectable()
export class PrivateReportStorageService {
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly prefix?: string;

  constructor(config: ConfigService) {
    const required = [
      'S3_ENDPOINT',
      'S3_BUCKET',
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
    ] as const;
    const values = Object.fromEntries(
      required.map((key) => [key, config.get<string>(key)]),
    ) as Record<(typeof required)[number], string | undefined>;
    for (const key of required)
      if (!values[key])
        throw new Error(`${key} is required for private report storage.`);
    const region = config.get<string>('S3_REGION', 'auto');
    if (region !== 'auto')
      throw new Error('S3_REGION must be auto for private report storage.');
    this.prefix = this.normalizePrefix(config.get<string>('REPORT_STORAGE_PREFIX'));
    this.bucket = values.S3_BUCKET!;
    this.client = new S3Client({
      endpoint: values.S3_ENDPOINT,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: values.S3_ACCESS_KEY!,
        secretAccessKey: values.S3_SECRET_KEY!,
      },
    });
  }

  buildReportObjectKey(sessionId: string, version: number): string {
    const reportKey = `reports/${sessionId}/v${version}.pdf`;
    return this.prefix ? `${this.prefix}/${reportKey}` : reportKey;
  }

  async put(
    objectKey: string,
    body: Buffer,
    object: PrivateReportObject,
  ): Promise<PrivateReportUpload> {
    try {
      const result = await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: body,
          ContentType: 'application/pdf',
          ContentLength: body.length,
          Metadata: {
            contentHash: object.contentHash,
            version: String(object.version),
          },
          IfNoneMatch: '*',
        }),
      );
      return { objectKey, etag: result.ETag, versionId: result.VersionId };
    } catch (error) {
      if (this.status(error) === 412)
        throw new ImmutableReportObjectCollisionError();
      throw this.failure();
    }
  }
  async head(objectKey: string): Promise<Record<string, string> | null> {
    try {
      return (
        (
          await this.client.send(
            new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
          )
        ).Metadata ?? null
      );
    } catch (error) {
      if (this.status(error) === 404 || this.name(error) === 'NoSuchKey')
        return null;
      throw this.failure();
    }
  }
  async get(objectKey: string): Promise<Buffer | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      if (!result.Body) return null;
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      if (this.status(error) === 404 || this.name(error) === 'NoSuchKey')
        return null;
      throw this.failure();
    }
  }
  async delete(objectKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
    } catch {
      throw this.failure();
    }
  }
  private normalizePrefix(prefix: string | undefined): string | undefined {
    if (!prefix) return undefined;
    const normalized = prefix.trim();
    if (!normalized) return undefined;
    const segments = normalized.split('/');
    if (
      segments.some(
        (segment) =>
          segment === '.' ||
          segment === '..' ||
          !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment),
      )
    ) {
      throw new Error('REPORT_STORAGE_PREFIX contains invalid path segments.');
    }
    return normalized;
  }
  private failure(): InternalServerErrorException {
    return new InternalServerErrorException('Private report storage failed.');
  }
  private status(error: unknown): number | undefined {
    return (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;
  }
  private name(error: unknown): string | undefined {
    return (error as { name?: string })?.name;
  }
}
