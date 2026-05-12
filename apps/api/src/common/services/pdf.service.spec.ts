import * as puppeteer from 'puppeteer';
import { PdfService } from './pdf.service';

jest.mock('puppeteer');

describe('PdfService', () => {
  const mockPage = {
    setContent: jest.fn(),
    pdf: jest.fn(),
    goto: jest.fn(),
    close: jest.fn(),
    isClosed: jest.fn(),
    setDefaultNavigationTimeout: jest.fn(),
    setDefaultTimeout: jest.fn(),
  } as unknown as puppeteer.Page;

  const mockBrowser = {
    newPage: jest.fn(),
    close: jest.fn(),
    isConnected: jest.fn(),
  } as unknown as puppeteer.Browser;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPage.isClosed = jest.fn().mockReturnValue(false);
    mockPage.pdf = jest.fn().mockResolvedValue(Buffer.from('pdf'));
    mockBrowser.newPage = jest.fn().mockResolvedValue(mockPage);
    mockBrowser.isConnected = jest.fn().mockReturnValue(true);
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
  });

  it('reuses the same browser launch promise', async () => {
    const service = new PdfService();

    const promise = Promise.all([
      service.generateFromHtml('<p>1</p>'),
      service.generateFromHtml('<p>2</p>'),
    ]);

    await promise;

    expect(puppeteer.launch).toHaveBeenCalledTimes(1);
  });

  it('creates a new page when none are idle', async () => {
    const service = new PdfService();

    await service.generateFromHtml('<p>1</p>');

    expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
  });
});
