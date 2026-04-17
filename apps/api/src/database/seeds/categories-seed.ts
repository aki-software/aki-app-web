import { DataSource, EntityManager } from 'typeorm';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { typeOrmConfig } from '../../config/typeorm.config';
import { VocationalCategory } from '../../categories/entities/vocational-category.entity';

type RepoProvider = Pick<DataSource, 'getRepository'> | EntityManager;

type MaterialCategoryItem = {
  categoryId: string;
  title: string;
  text: string;
};

const DEFAULT_MATERIAL_PATH =
  '../../../CotejoApp/app/src/main/assets/material_teorico.json';

function getMaterialPath(): string {
  const customPath = process.env.SEED_MATERIAL_TEORICO_PATH?.trim();
  if (customPath) {
    return resolve(process.cwd(), customPath);
  }

  return resolve(process.cwd(), DEFAULT_MATERIAL_PATH);
}

async function loadMaterialCategories(): Promise<MaterialCategoryItem[]> {
  const filePath = getMaterialPath();
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid material file at ${filePath}: expected array`);
  }

  const validated: MaterialCategoryItem[] = parsed.map((item, index) => {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as { categoryId?: unknown }).categoryId !== 'string' ||
      typeof (item as { title?: unknown }).title !== 'string' ||
      typeof (item as { text?: unknown }).text !== 'string'
    ) {
      throw new Error(
        `Invalid category entry at index ${index} in ${filePath}: expected { categoryId, title, text } strings`,
      );
    }

    const categoryId = (item as { categoryId: string }).categoryId
      .trim()
      .toUpperCase();
    const title = (item as { title: string }).title.trim();
    const description = (item as { text: string }).text.trim();

    if (!categoryId || !title || !description) {
      throw new Error(
        `Invalid category entry at index ${index} in ${filePath}: categoryId/title/text cannot be empty`,
      );
    }

    return {
      categoryId,
      title,
      text: description,
    };
  });

  return validated;
}

export async function upsertVocationalCategories(
  provider: RepoProvider,
): Promise<{ insertedOrUpdated: number }> {
  const categoryRepo = provider.getRepository(VocationalCategory);
  const categories = await loadMaterialCategories();

  for (const category of categories) {
    const existing = await categoryRepo.findOne({
      where: { categoryId: category.categoryId },
    });

    if (existing) {
      existing.title = category.title;
      existing.description = category.text;
      await categoryRepo.save(existing);
      continue;
    }

    const created = categoryRepo.create({
      categoryId: category.categoryId,
      title: category.title,
      description: category.text,
    });
    await categoryRepo.save(created);
  }

  console.log(`Categories seed loaded from: ${getMaterialPath()}`);
  console.log(`Categories upserted: ${categories.length}`);

  return { insertedOrUpdated: categories.length };
}

async function seedCategoriesCli() {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('Initializing categories seed...');
    await dataSource.initialize();
    await upsertVocationalCategories(dataSource);
    console.log('Categories seed finished successfully.');
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void seedCategoriesCli();
}
