import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateFromHtml(html: string): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(30_000);
      page.setDefaultTimeout(30_000);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      const message = (error as Error)?.message ?? 'unknown error';
      this.logger.error(`PDF generation failed: ${message}`);

      if (message.includes('Could not find Chrome')) {
        this.logger.error(
          'Chrome for Puppeteer is missing. Run: pnpm exec puppeteer browsers install chrome',
        );
      }

      throw new InternalServerErrorException(
        'Error al generar el documento PDF.',
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
