import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private readonly idlePages: puppeteer.Page[] = [];
  private readonly maxIdlePages = 4;
  private readonly pageTimeoutMs = 30_000;
  private browser: puppeteer.Browser | undefined;
  private browserLaunching: Promise<puppeteer.Browser> | undefined;

  async generateFromHtml(html: string): Promise<Buffer> {
    let page: puppeteer.Page | undefined;
    try {
      page = await this.acquirePage();
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
      if (page) {
        await this.releasePage(page);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  private async acquirePage(): Promise<puppeteer.Page> {
    const browser = await this.getBrowser();
    const page = this.idlePages.pop() ?? (await browser.newPage());
    page.setDefaultNavigationTimeout(this.pageTimeoutMs);
    page.setDefaultTimeout(this.pageTimeoutMs);
    return page;
  }

  private async releasePage(page: puppeteer.Page): Promise<void> {
    if (page.isClosed()) {
      return;
    }

    try {
      await page.goto('about:blank');
    } catch (error) {
      this.logger.warn(
        `PDF page reset failed: ${(error as Error)?.message ?? 'unknown'}`,
      );
      // Si falla el reset (ej. 'detached Frame'), la página quedó corrupta. 
      // La cerramos y evitamos devolverla al pool.
      try {
        await page.close();
      } catch (closeError) {
        // Ignoramos errores al forzar el cierre
      }
      return;
    }

    if (this.idlePages.length < this.maxIdlePages) {
      this.idlePages.push(page);
      return;
    }

    try {
      await page.close();
    } catch (error) {
      this.logger.warn(
        `PDF page close failed: ${(error as Error)?.message ?? 'unknown'}`,
      );
    }
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.browserLaunching) {
      return this.browserLaunching;
    }

    this.browserLaunching = puppeteer
      .launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
          '--memory-pressure-off',
          '--js-flags=--max-old-space-size=256',
        ],
      })
      .then((browser) => {
        this.browser = browser;
        return browser;
      })
      .catch((error) => {
        this.browserLaunching = undefined;
        throw error;
      });

    return this.browserLaunching;
  }

  private async closeBrowser(): Promise<void> {
    const pages = this.idlePages.splice(0, this.idlePages.length);
    await Promise.all(
      pages.map(async (page) => {
        if (page.isClosed()) {
          return;
        }
        try {
          await page.close();
        } catch (error) {
          this.logger.warn(
            `PDF idle page close failed: ${(error as Error)?.message ?? 'unknown'}`,
          );
        }
      }),
    );

    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        this.logger.warn(
          `PDF browser close failed: ${(error as Error)?.message ?? 'unknown'}`,
        );
      } finally {
        this.browser = undefined;
      }
    }

    this.browserLaunching = undefined;
  }
}
