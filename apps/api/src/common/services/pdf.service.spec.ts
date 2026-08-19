import { DETERMINISTIC_PDF_OPTIONS, PdfService } from './pdf.service';

const mockLaunch = jest.fn();

jest.mock('puppeteer-core', () => ({ launch: mockLaunch }));

describe('PdfService deterministic rendering boundary', () => {
  const executablePath = '/opt/chrome/chrome';
  const originalExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SERVERLESS;
  });

  afterEach(() => {
    if (originalExecutablePath === undefined) {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      return;
    }
    process.env.PUPPETEER_EXECUTABLE_PATH = originalExecutablePath;
  });

  function createPage(
    pdf: jest.Mock = jest.fn().mockResolvedValue(Buffer.from('pdf')),
  ) {
    const handlers = new Set<(request: any) => void>();
    return {
      handlers,
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn((_name, handler) => handlers.add(handler)),
      off: jest.fn((_name, handler) => handlers.delete(handler)),
      setContent: jest.fn(),
      pdf,
    };
  }

  it('rejects a local launch without the pinned Chrome executable path', async () => {
    const service = new PdfService();

    delete process.env.PUPPETEER_EXECUTABLE_PATH;

    await expect((service as any).getBrowser()).rejects.toThrow(
      'PUPPETEER_EXECUTABLE_PATH is required for the pinned Chrome-for-Testing binary.',
    );
    expect(mockLaunch).not.toHaveBeenCalled();
  });

  it('launches the resolved pinned executable with stable options', async () => {
    const browser = { isConnected: jest.fn().mockReturnValue(true) };
    mockLaunch.mockResolvedValue(browser);
    process.env.PUPPETEER_EXECUTABLE_PATH = executablePath;
    const service = new PdfService();

    await expect((service as any).getBrowser()).resolves.toBe(browser);

    expect(mockLaunch).toHaveBeenCalledWith({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--memory-pressure-off',
        '--js-flags=--max-old-space-size=256',
      ],
    });
  });

  it('does not accumulate request handlers across sequential reused-page renders', async () => {
    const page = createPage();
    const firstRequest = {
      url: () => 'https://remote.test/first.css',
      abort: jest.fn().mockResolvedValue(undefined),
      continue: jest.fn(),
    };
    const secondRequest = {
      url: () => 'https://remote.test/second.css',
      abort: jest.fn().mockResolvedValue(undefined),
      continue: jest.fn(),
    };
    const remoteRequests = [firstRequest, secondRequest];
    page.setContent.mockImplementation(() => {
      const request = remoteRequests.shift();
      page.handlers.forEach((handler) => handler(request));
    });
    const service = new PdfService();
    (service as any).acquirePage = jest.fn().mockResolvedValue(page);
    (service as any).releasePage = jest.fn();

    await service.generateFromHtml('<html/>');
    await service.generateFromHtml('<html/>');

    expect(page.handlers.size).toBe(0);
    expect(remoteRequests).toHaveLength(0);
    expect(firstRequest.abort).toHaveBeenCalledTimes(1);
    expect(secondRequest.abort).toHaveBeenCalledTimes(1);
    expect(page.on).toHaveBeenCalledTimes(2);
    expect(page.off).toHaveBeenCalledTimes(2);
    expect(page.setRequestInterception).toHaveBeenNthCalledWith(1, true);
    expect(page.setRequestInterception).toHaveBeenNthCalledWith(2, false);
    expect(page.setRequestInterception).toHaveBeenNthCalledWith(3, true);
    expect(page.setRequestInterception).toHaveBeenNthCalledWith(4, false);
  });

  it('blocks remote requests and uses stable PDF options while releasing the page', async () => {
    const page = createPage();
    const service = new PdfService();
    (service as any).acquirePage = jest.fn().mockResolvedValue(page);
    (service as any).releasePage = jest.fn();

    await expect(service.generateFromHtml('<html/>')).resolves.toEqual(
      Buffer.from('pdf'),
    );
    expect(page.setContent).toHaveBeenCalledWith('<html/>', {
      waitUntil: 'load',
    });
    expect(page.pdf).toHaveBeenCalledWith(DETERMINISTIC_PDF_OPTIONS);
    expect((service as any).releasePage).toHaveBeenCalledWith(page);
  });

  it('removes its request handler and disables interception before releasing a failed render page', async () => {
    const order: string[] = [];
    const page = createPage(
      jest.fn().mockRejectedValue(new Error('chrome failed')),
    );
    page.off.mockImplementation((_name, handler) => {
      order.push('off');
      page.handlers.delete(handler);
    });
    page.setRequestInterception.mockImplementation((enabled) => {
      order.push(`interception:${enabled}`);
      return Promise.resolve();
    });
    const service = new PdfService();
    (service as any).acquirePage = jest.fn().mockResolvedValue(page);
    (service as any).releasePage = jest.fn(() => order.push('release'));

    await expect(service.generateFromHtml('<html/>')).rejects.toThrow(
      'Error al generar el documento PDF.',
    );
    expect(page.handlers.size).toBe(0);
    expect(order).toEqual([
      'interception:true',
      'off',
      'interception:false',
      'release',
    ]);
    expect((service as any).releasePage).toHaveBeenCalledWith(page);
  });
});
