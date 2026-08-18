import { DataSource } from 'typeorm';
import { VocationalCategory } from '../../categories/entities/vocational-category.entity.js';
import { typeOrmConfig } from '../../config/typeorm.config.js';
import { TresAreasCombination } from '../../tres-areas/entities/tres-areas-combination.entity.js';
import { loadReportContent } from './report-content-loader.js';

type VerificationSummary = {
  expected: number;
  actual: number;
  mismatches: string[];
};

export type ReportContentVerification = {
  categories: VerificationSummary;
  combinations: VerificationSummary;
};

function compareRecord(
  type: 'category' | 'combination',
  key: string,
  expected: Record<string, unknown>,
  actual: object | undefined,
  mismatches: string[],
): void {
  if (!actual) {
    mismatches.push(`Missing ${type} ${key}`);
    return;
  }
  const actualRecord = actual as Record<string, unknown>;
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (JSON.stringify(actualRecord[field]) !== JSON.stringify(expectedValue)) {
      mismatches.push(`${type} ${key}: ${field} differs`);
    }
  }
}

export async function verifyReportContent(
  dataSource: Pick<DataSource, 'getRepository'>,
): Promise<ReportContentVerification> {
  const content = await loadReportContent();
  const [categories, combinations] = await Promise.all([
    dataSource.getRepository(VocationalCategory).find(),
    dataSource.getRepository(TresAreasCombination).find(),
  ]);

  const categoryMismatches: string[] = [];
  const categoriesById = new Map(
    categories.map((item) => [item.categoryId, item]),
  );
  for (const expected of content.categories) {
    compareRecord(
      'category',
      expected.categoryId,
      expected,
      categoriesById.get(expected.categoryId),
      categoryMismatches,
    );
  }
  for (const actual of categories) {
    if (
      !content.categories.some(
        (expected) => expected.categoryId === actual.categoryId,
      )
    ) {
      categoryMismatches.push(`Unexpected category ${actual.categoryId}`);
    }
  }

  const combinationMismatches: string[] = [];
  const combinationsByKey = new Map(
    combinations.map((item) => [item.combinationKey, item]),
  );
  for (const expected of content.combinations) {
    compareRecord(
      'combination',
      expected.combinationKey,
      {
        ...expected,
        tendencies: expected.competencies,
        possibleJobs: expected.possibleJobs.join(', '),
        relatedProfessions: expected.relatedProfessions.join(', '),
      },
      combinationsByKey.get(expected.combinationKey),
      combinationMismatches,
    );
  }
  for (const actual of combinations) {
    if (
      !content.combinations.some(
        (expected) => expected.combinationKey === actual.combinationKey,
      )
    ) {
      combinationMismatches.push(
        `Unexpected combination ${actual.combinationKey}`,
      );
    }
  }

  return {
    categories: {
      expected: content.categories.length,
      actual: categories.length,
      mismatches: categoryMismatches,
    },
    combinations: {
      expected: content.combinations.length,
      actual: combinations.length,
      mismatches: combinationMismatches,
    },
  };
}

async function runReportContentVerification(): Promise<void> {
  const dataSource = new DataSource({ ...typeOrmConfig, migrations: [] });
  try {
    await dataSource.initialize();
    const result = await verifyReportContent(dataSource);
    console.log(
      `Categories: expected ${result.categories.expected}, found ${result.categories.actual}, mismatches ${result.categories.mismatches.length}.`,
    );
    console.log(
      `Combinations: expected ${result.combinations.expected}, found ${result.combinations.actual}, mismatches ${result.combinations.mismatches.length}.`,
    );
    const mismatches = [
      ...result.categories.mismatches,
      ...result.combinations.mismatches,
    ];
    if (mismatches.length) {
      for (const mismatch of mismatches) console.error(mismatch);
      process.exitCode = 1;
    }
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

void runReportContentVerification().catch((error) => {
  console.error('Unable to verify canonical report content:', error);
  process.exitCode = 1;
});
