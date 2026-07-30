export interface StorageAdapter {
  uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType?: string,
  ): Promise<string | null>;
  getPresignedUploadUrl?(
    fileName: string,
    mimeType: string,
    expiresIn?: number,
  ): Promise<string | null>;
  getPresignedDownloadUrl?(
    fileName: string,
    expiresIn?: number,
  ): Promise<string | null>;
}
