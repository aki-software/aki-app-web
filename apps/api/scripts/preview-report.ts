import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReportRenderInput } from '../src/reports/report-renderer.service.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(scriptDirectory, '../..');
const fixturePath = path.join(
  apiRoot,
  'src',
  'reports',
  'fixtures',
  'report-preview.json',
);
const outputPath = path.join(apiRoot, 'tmp', 'report-preview.pdf');

async function main(): Promise<void> {
  if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
    throw new Error(
      'PUPPETEER_EXECUTABLE_PATH is required to generate the local report preview.',
    );
  }

  const input = JSON.parse(
    await readFile(fixturePath, 'utf8'),
  ) as ReportRenderInput;
  const [
    { PdfService },
    { ReportRendererService },
    { TemplateRendererService },
  ] = await Promise.all([
    import('../common/services/pdf.service.js'),
    import('../reports/report-renderer.service.js'),
    import('../notifications/services/template-renderer.service.js'),
  ]);
  const pdfGenerator = new PdfService();
  const renderer = new ReportRendererService(
    pdfGenerator,
    new TemplateRendererService(),
  );

  try {
    const { pdf } = await renderer.render(input);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, pdf);
    console.log(`Report preview written to ${outputPath}`);
  } finally {
    await pdfGenerator.onModuleDestroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
