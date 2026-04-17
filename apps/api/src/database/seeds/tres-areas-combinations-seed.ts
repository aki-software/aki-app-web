import { DataSource, EntityManager } from 'typeorm';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { typeOrmConfig } from '../../config/typeorm.config';
import { TresAreasCombination } from '../../common/entities/tres-areas-combination.entity';

type RepoProvider = Pick<DataSource, 'getRepository'> | EntityManager;

type RawTresAreasPayload = {
  combinations: Array<{
    title: string;
    categories: string[];
    narrative: string;
    tendencies: string[];
    possibleJobs: string;
    relatedProfessions: string;
  }>;
};

type TresAreasRecord = {
  title: string;
  area1: string;
  area2: string;
  area3: string;
  combinationKey: string;
  narrative: string;
  tendencies: string[];
  possibleJobs: string;
  relatedProfessions: string;
};

const DEFAULT_SOURCE_PATH = 'src/common/assets/tres-areas-content.json';

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildCombinationKey(categories: string[]): string {
  return categories
    .map((name) => normalize(name))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .join('|');
}

function getSourcePath(): string {
  const customPath = process.env.SEED_TRES_AREAS_PATH?.trim();
  if (customPath) {
    return resolve(process.cwd(), customPath);
  }

  return resolve(process.cwd(), DEFAULT_SOURCE_PATH);
}

async function loadTresAreasRecords(): Promise<TresAreasRecord[]> {
  const sourcePath = getSourcePath();
  const raw = await readFile(sourcePath, 'utf8');
  const parsed = JSON.parse(raw) as RawTresAreasPayload;

  if (!parsed || !Array.isArray(parsed.combinations)) {
    throw new Error(
      `Invalid tres areas payload at ${sourcePath}: expected combinations array`,
    );
  }

  return parsed.combinations.map((item, index) => {
    if (
      !item ||
      !Array.isArray(item.categories) ||
      item.categories.length < 3
    ) {
      throw new Error(
        `Invalid tres areas entry at index ${index}: expected at least 3 categories`,
      );
    }

    const categories = item.categories.map((value) => String(value).trim());
    const [area1, area2, area3] = categories;

    if (!area1 || !area2 || !area3) {
      throw new Error(
        `Invalid tres areas entry at index ${index}: area names cannot be empty`,
      );
    }

    return {
      title: String(item.title ?? '').trim(),
      area1,
      area2,
      area3,
      combinationKey: buildCombinationKey(categories),
      narrative: String(item.narrative ?? '').trim(),
      tendencies: Array.isArray(item.tendencies)
        ? item.tendencies
            .map((itemValue) => String(itemValue).trim())
            .filter(Boolean)
        : [],
      possibleJobs: String(item.possibleJobs ?? '').trim(),
      relatedProfessions: String(item.relatedProfessions ?? '').trim(),
    };
  });
}

export async function upsertTresAreasCombinations(
  provider: RepoProvider,
): Promise<{ insertedOrUpdated: number }> {
  const repo = provider.getRepository(TresAreasCombination);
  const records = await loadTresAreasRecords();

  for (const record of records) {
    const existing = await repo.findOne({
      where: { combinationKey: record.combinationKey },
    });

    if (existing) {
      existing.title = record.title;
      existing.area1 = record.area1;
      existing.area2 = record.area2;
      existing.area3 = record.area3;
      existing.narrative = record.narrative;
      existing.tendencies = record.tendencies;
      existing.possibleJobs = record.possibleJobs;
      existing.relatedProfessions = record.relatedProfessions;
      await repo.save(existing);
      continue;
    }

    const created = repo.create(record);
    await repo.save(created);
  }

  console.log(`Tres areas seed loaded from: ${getSourcePath()}`);
  console.log(`Tres areas combinations upserted: ${records.length}`);

  return { insertedOrUpdated: records.length };
}

async function seedTresAreasCli() {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('Initializing tres areas combinations seed...');
    await dataSource.initialize();
    await upsertTresAreasCombinations(dataSource);
    console.log('Tres areas combinations seed finished successfully.');
  } catch (error) {
    console.error('Error seeding tres areas combinations:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void seedTresAreasCli();
}
