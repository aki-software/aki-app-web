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
    name: 'AuthUserSummary',
    samples: [
      JSON.stringify({
        id: "uuid",
        email: "test@test.com",
        name: "Test User",
        role: "PATIENT",
        institutionId: "uuid",
        institutionName: "Inst"
      })
    ]
  });

  await jsonInput.addSource({
    name: 'AuthTokens',
    samples: [
      JSON.stringify({
        accessToken: "jwt.token.string",
        refreshToken: "jwt.token.string"
      })
    ]
  });

  await jsonInput.addSource({
    name: 'AuthLoginResponse',
    samples: [
      JSON.stringify({
        user: {
          id: "uuid",
          email: "test@test.com",
          name: "Test User",
          role: "PATIENT"
        },
        tokens: {
          accessToken: "jwt",
          refreshToken: "jwt"
        }
      })
    ]
  });

  await jsonInput.addSource({
    name: 'SessionResultData',
    samples: [
      JSON.stringify({
        categoryId: "R",
        percentage: 85.5
      })
    ]
  });

  await jsonInput.addSource({
    name: 'SessionApi',
    samples: [
      JSON.stringify({
        id: "uuid",
        patientName: "John Doe",
        createdAt: "2026-05-18T12:00:00Z",
        totalTimeMs: 120000,
        paymentStatus: "PENDING",
        reportUnlockedAt: null,
        results: [
          { categoryId: "R", percentage: 85.5 }
        ],
        institution: { name: "Inst" },
        therapist: { name: "Dr. Smith" },
        voucher: { code: "VCH12345" }
      })
    ]
  });

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
