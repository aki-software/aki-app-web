import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import type { Browser, Page } from 'puppeteer-core';
import { PdfGenerator } from '../adapters/pdf-generator.adapter.js';

@Injectable()
export class PdfService implements PdfGenerator, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private readonly idlePages: Page[] = [];
  private readonly maxIdlePages = 4;
  private readonly pageTimeoutMs = 30_000;
  private browser: Browser | undefined;
  private browserLaunching: Promise<Browser> | undefined;

  async generateFromHtml(html: string, signal?: AbortSignal): Promise<Buffer> {
    if (signal?.aborted) {
      throw new Error('PDF generation aborted');
    }

    let page: Page | undefined;
    try {
      page = await this.acquirePage();

      if (signal?.aborted) {
        throw new Error('PDF generation aborted');
      }

      await page.setContent(html, { waitUntil: 'networkidle0' });

      if (signal?.aborted) {
        throw new Error('PDF generation aborted');
      }

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

      if (
        message.includes('Connection closed') ||
        message.includes('Target closed') ||
        message.includes('Protocol error')
      ) {
        this.logger.warn(
          'Destruyendo instancia corrupta de Puppeteer para forzar reinicio.',
        );
        await this.closeBrowser().catch(() => {});
      }

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

  private async acquirePage(): Promise<Page> {
    const browser = await this.getBrowser();
    const page = this.idlePages.pop() ?? (await browser.newPage());
    page.setDefaultNavigationTimeout(this.pageTimeoutMs);
    page.setDefaultTimeout(this.pageTimeoutMs);
    return page;
  }

  private async releasePage(page: Page): Promise<void> {
    if (page.isClosed()) {
      return;
    }

    try {
      await page.goto('about:blank');
    } catch (error) {
      this.logger.warn(
        `PDF page reset failed: ${(error as Error)?.message ?? 'unknown'}`,
      );
      try {
        await page.close();
      } catch {
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

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.browserLaunching) {
      return this.browserLaunching;
    }

    if (process.env.SERVERLESS === 'true') {
      const chromium = await import('@sparticuz/chromium');
      const puppeteerCore = await import('puppeteer-core');

      this.browserLaunching = puppeteerCore
        .launch({
          args: chromium.default.args,
          executablePath: await chromium.default.executablePath(),
          headless: chromium.default.headless,
        })
        .then((browser) => {
          this.browser = browser as unknown as Browser;
          return this.browser;
        })
        .catch((error) => {
          this.browserLaunching = undefined;
          throw error;
        });

      return this.browserLaunching;
    }

    const puppeteer = await import('puppeteer-core');

    this.browserLaunching = puppeteer
      .launch({
        channel: 'chrome',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--memory-pressure-off',
          '--js-flags=--max-old-space-size=256',
        ],
      })
      .then((browser: Browser) => {
        this.browser = browser;
        return browser;
      })
      .catch((error: unknown) => {
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
