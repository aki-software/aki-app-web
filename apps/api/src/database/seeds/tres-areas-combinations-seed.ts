import { DataSource, EntityManager } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config.js';
import { TresAreasCombination } from '../../tres-areas/entities/tres-areas-combination.entity.js';
import {
  loadReportContent,
  ReportContentCombination,
} from './report-content-loader.js';

type RepoProvider = Pick<DataSource, 'getRepository'> | EntityManager;

export async function upsertTresAreasCombinations(
  provider: RepoProvider,
  combinations?: ReportContentCombination[],
): Promise<{ insertedOrUpdated: number }> {
  const repo = provider.getRepository(TresAreasCombination);
  const content = combinations ?? (await loadReportContent()).combinations;

  for (const combination of content) {
    const existing = await repo.findOne({
      where: { combinationKey: combination.combinationKey },
    });
    const record = existing ?? repo.create({ combinationKey: combination.combinationKey });
    record.title = combination.title;
    record.area1 = combination.area1;
    record.area2 = combination.area2;
    record.area3 = combination.area3;
    record.narrative = combination.narrative;
    record.keyInsight = combination.keyInsight;
    record.competencies = combination.competencies;
    record.tendencies = combination.competencies;
    record.possibleJobs = combination.possibleJobs.join(', ');
    record.relatedProfessions = combination.relatedProfessions.join(', ');
    await repo.save(record);
  }

  return { insertedOrUpdated: content.length };
}

async function seedTresAreasCli() {
  const dataSource = new DataSource({ ...typeOrmConfig, migrations: [] });
  try {
    await dataSource.initialize();
    await dataSource.transaction((manager) => upsertTresAreasCombinations(manager));
  } catch (error) {
    console.error('Error seeding canonical tres areas combinations:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

if (require.main === module) void seedTresAreasCli();
