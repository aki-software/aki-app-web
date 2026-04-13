import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} from 'quicktype-core';

async function main() {
  const workspaceRoot = resolve(process.cwd(), '..', '..');
  const destinationDir = join(
    workspaceRoot,
    '..',
    'CotejoApp',
    'app',
    'src',
    'main',
    'java',
    'com',
    'akit',
    'app',
    'contracts',
    'generated',
  );

  const jsonInput = jsonInputForTargetLanguage('kotlin');
  await jsonInput.addSource({
    name: 'RedeemVoucherRequest',
    samples: [
      JSON.stringify({
        code: 'AB12CD34',
        sessionId: '11111111-1111-4111-8111-111111111111',
      }),
    ],
  });
  await jsonInput.addSource({
    name: 'RedeemVoucherResponse',
    samples: [
      JSON.stringify({
        success: true,
        status: 'REDEEMED',
        voucherCode: 'AB12CD34',
        sessionId: '11111111-1111-4111-8111-111111111111',
      }),
    ],
  });
  await jsonInput.addSource({
    name: 'AppError',
    samples: [
      JSON.stringify({
        code: 'INVALID_CODE',
        message: 'Voucher code does not exist',
        statusCode: 404,
        timestamp: '2026-04-13T00:00:00.000Z',
        path: '/api/v1/vouchers/redeem',
      }),
    ],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const result = await quicktype({
    inputData,
    lang: 'kotlin',
    rendererOptions: {
      'package': 'com.akit.app.contracts.generated',
      'framework': 'kotlinx',
      'just-types': 'true',
    },
  });

  mkdirSync(destinationDir, { recursive: true });
  const outputPath = join(destinationDir, 'VoucherContracts.kt');
  writeFileSync(outputPath, `${result.lines.join('\n')}\n`, 'utf-8');
  console.log(`Generated Android contracts at ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
