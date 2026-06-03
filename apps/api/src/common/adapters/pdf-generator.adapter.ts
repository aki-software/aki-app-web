export interface PdfGenerator {
  generateFromHtml(html: string, signal?: AbortSignal): Promise<Buffer>;
}
