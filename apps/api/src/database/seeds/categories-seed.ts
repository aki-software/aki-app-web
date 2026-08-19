import { DataSource, EntityManager } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config.js';
import { VocationalCategory } from '../../categories/entities/vocational-category.entity.js';
import {
  loadReportContent,
  ReportContentCategory,
} from './report-content-loader.js';

type RepoProvider = Pick<DataSource, 'getRepository'> | EntityManager;

export async function upsertVocationalCategories(
  provider: RepoProvider,
  categories?: ReportContentCategory[],
): Promise<{ insertedOrUpdated: number }> {
  const categoryRepo = provider.getRepository(VocationalCategory);
  const content = categories ?? (await loadReportContent()).categories;

  for (const category of content) {
    const existing = await categoryRepo.findOne({
      where: { categoryId: category.categoryId },
    });
    const record =
      existing ?? categoryRepo.create({ categoryId: category.categoryId });
    record.title = category.title;
    record.description = category.description;
    record.occupations = category.occupations;
    record.formalProfessions = category.formalProfessions;
    record.competencies = category.competencies;
    await categoryRepo.save(record);
  }

  return { insertedOrUpdated: content.length };
}

async function seedCategoriesCli() {
  const dataSource = new DataSource({ ...typeOrmConfig, migrations: [] });
  try {
    await dataSource.initialize();
    await dataSource.transaction((manager) =>
      upsertVocationalCategories(manager),
    );
  } catch (error) {
    console.error('Error seeding canonical categories:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

if (require.main === module) void seedCategoriesCli();
