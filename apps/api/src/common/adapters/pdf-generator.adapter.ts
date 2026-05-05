export interface PdfGenerator {
  generateFromHtml(html: string): Promise<Buffer>;
}
