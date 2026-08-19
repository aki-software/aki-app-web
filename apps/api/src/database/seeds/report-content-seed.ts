import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config.js';
import { upsertVocationalCategories } from './categories-seed.js';
import { upsertTresAreasCombinations } from './tres-areas-combinations-seed.js';
import {
  getReportContentPaths,
  loadReportContent,
} from './report-content-loader.js';

async function runReportContentSeed(): Promise<void> {
  const content = await loadReportContent();
  const paths = getReportContentPaths();
  const checkOnly =
    process.argv.includes('--check') || process.argv.includes('--dry-run');

  console.log(
    `Validated ${content.categories.length} categories and ${content.combinations.length} combinations.`,
  );
  console.log(
    `Canonical files: ${paths.materialPath}, ${paths.combinationsPath}`,
  );
  if (checkOnly) return;

  const dataSource = new DataSource({ ...typeOrmConfig, migrations: [] });
  try {
    await dataSource.initialize();
    await dataSource.transaction(async (manager) => {
      await upsertVocationalCategories(manager, content.categories);
      await upsertTresAreasCombinations(manager, content.combinations);
    });
    console.log('Canonical report content imported successfully.');
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

void runReportContentSeed().catch((error) => {
  console.error('Unable to seed canonical report content:', error);
  process.exitCode = 1;
});
