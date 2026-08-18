import { createHash } from 'node:crypto';
import { ReportRendererService } from './report-renderer.service';

describe('ReportRendererService', () => {
  it('uses a canonical input hash and local-only template assets', async () => {
    const templates = { renderTemplate: jest.fn().mockReturnValue('<html />') };
    const pdfGenerator = {
      generateFromHtml: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    const service = new ReportRendererService(pdfGenerator, templates as any);
    const input = {
      locale: 'es-AR',
      timeZone: 'UTC',
      generatedAt: '2026-01-01T00:00:00.000Z',
      assessmentAt: '2025-12-01T00:00:00.000Z',
      templateVersion: 'v1',
      reportVersion: 1,
      data: { z: 1, a: { y: 2, x: 1 } },
    };
    const reordered = { ...input, data: { a: { x: 1, y: 2 }, z: 1 } };
    expect((await service.render(input)).inputHash).toBe(
      (await service.render(reordered)).inputHash,
    );
    expect(templates.renderTemplate).toHaveBeenCalledWith(
      'report-pdf.pug',
      expect.objectContaining({
        logoDataUri: expect.stringMatching(/^data:image\/png;base64,.+$/),
        locale: 'es-AR',
        timeZone: 'UTC',
      }),
    );
  });

  it('embeds the required Inter font weights as local data URIs', async () => {
    const templates = { renderTemplate: jest.fn().mockReturnValue('<html />') };
    const pdfGenerator = {
      generateFromHtml: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    const service = new ReportRendererService(pdfGenerator, templates as any);
    const input = {
      locale: 'es-AR',
      timeZone: 'UTC',
      generatedAt: '2026-01-01T00:00:00.000Z',
      assessmentAt: '2025-12-01T00:00:00.000Z',
      templateVersion: 'v1',
      reportVersion: 1,
      data: {},
    };

    await service.render(input);

    const { fontFaceCss } = templates.renderTemplate.mock.calls[0][1];
    const fontDataUris = fontFaceCss.match(/data:font\/woff2;base64,[^;]+/g);
    expect(fontDataUris).toHaveLength(4);
    fontDataUris.forEach((uri: string) => {
      expect(uri).toMatch(/^data:font\/woff2;base64,.+$/);
    });
    expect(templates.renderTemplate).toHaveBeenCalledWith(
      'report-pdf.pug',
      expect.objectContaining({
        fontFaceCss: expect.stringContaining('@font-face'),
      }),
    );
  });

  it('sorts canonical object keys by locale-independent code units', async () => {
    const templates = { renderTemplate: jest.fn().mockReturnValue('<html />') };
    const pdfGenerator = {
      generateFromHtml: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    const service = new ReportRendererService(pdfGenerator, templates as any);
    const input = {
      locale: 'es-AR',
      timeZone: 'UTC',
      generatedAt: '2026-01-01T00:00:00.000Z',
      assessmentAt: '2025-12-01T00:00:00.000Z',
      templateVersion: 'v1',
      reportVersion: 1,
      data: { ä: 'umlaut', z: 'zed', a: 'alpha' },
    };
    const expectedCanonicalInput = JSON.stringify({
      assessmentAt: input.assessmentAt,
      data: { a: 'alpha', z: 'zed', ä: 'umlaut' },
      generatedAt: input.generatedAt,
      locale: input.locale,
      reportVersion: input.reportVersion,
      templateVersion: input.templateVersion,
      timeZone: input.timeZone,
    });
    const expectedHash = createHash('sha256')
      .update(expectedCanonicalInput)
      .digest('hex');

    await expect(service.render(input)).resolves.toEqual({
      pdf: Buffer.from('pdf'),
      inputHash: expectedHash,
    });
  });
});
