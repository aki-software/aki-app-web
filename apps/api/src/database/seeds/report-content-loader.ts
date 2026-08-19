import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

export type ReportContentCategory = {
  categoryId: string;
  title: string;
  description: string;
  occupations: string[];
  formalProfessions: string[];
  competencies: string[];
};

export type ReportContentCombination = {
  title: string;
  area1: string;
  area2: string;
  area3: string;
  combinationKey: string;
  narrative: string;
  keyInsight: string;
  competencies: string[];
  possibleJobs: string[];
  relatedProfessions: string[];
};

export type ReportContent = {
  categories: ReportContentCategory[];
  combinations: ReportContentCombination[];
};

type RawCategory = {
  id: number;
  area: string;
  descripcion: string;
  ocupaciones_oficios: string;
  profesiones_tecnicas_formales: string;
  competencias: string;
};

type RawCombination = {
  id: number;
  combinacion: string;
  area_1: string;
  area_2: string;
  area_3: string;
  descripcion: string;
  competencias: string;
  ambitos_trabajo: string;
  profesiones_vinculadas: string;
  clave: string;
};

const CATEGORY_ID_BY_AREA: Record<string, string> = {
  artistico: 'ART',
  humanitario: 'HUM',
  'servicios y acomodacion': 'SERV',
  proteccion: 'PROT',
  'desempeno fisico': 'PHYS',
  industrial: 'IND',
  mecanica: 'MECH',
  'plantas y animales': 'NAT',
  liderazgo: 'LEAD',
  cientifico: 'SCI',
  ventas: 'SAL',
  'negocios y detalle': 'BUS',
};
const CONTAMINATION_MARKER = '*ALGUNAS PROFESIONES VINCULADAS:*';
const MATERIAL_FILE = 'orienta_ki_material_teorico.json';
const COMBINATIONS_FILE = 'orienta_ki_220_combinaciones.json';

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function requiredString(value: unknown, field: string, index: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      `Invalid report content at index ${index}: ${field} is required`,
    );
  }
  return value.trim();
}

const LIST_ABBREVIATION = /(?:^|\s)(?:LIC|PC|DR|DRA|PROF|ING|TEC|TÉC)$/iu;

function isListAbbreviation(value: string): boolean {
  return LIST_ABBREVIATION.test(value.trim());
}

function isStandaloneListAbbreviation(value: string): boolean {
  return /^(?:LIC|PC|DR|DRA|PROF|ING|TEC|TÉC)$/iu.test(value.trim());
}

function listError(field: string, index: number, reason: string): Error {
  return new Error(
    `Invalid report content at index ${index}: ${field} ${reason}`,
  );
}

/**
 * Parses editorial category lists where reviewed sources use either commas or
 * sentence periods as delimiters. Recognized professional abbreviations retain
 * their periods so `LIC. EN PSICOLOGÍA` and `PC. OPERADOR` remain intact.
 */
export function splitReviewedList(
  value: string,
  field: string,
  index: number,
): string[] {
  if (value.toUpperCase().includes(CONTAMINATION_MARKER)) {
    throw listError(field, index, 'contains professions contamination');
  }

  const items: string[] = [];
  let start = 0;
  const addItem = (end: number): void => {
    let item = value.slice(start, end).trim();
    if (!item) throw listError(field, index, 'contains an empty item');
    if (item.endsWith('.')) {
      const withoutPeriod = item.slice(0, -1).trim();
      if (isStandaloneListAbbreviation(withoutPeriod)) {
        throw listError(
          field,
          index,
          'is ambiguous after a terminal abbreviation',
        );
      }
      item = withoutPeriod;
    }
    if (!item) throw listError(field, index, 'contains an empty item');
    items.push(item);
  };

  for (let position = 0; position < value.length; position += 1) {
    const character = value[position];
    if (character === ',') {
      addItem(position);
      start = position + 1;
      continue;
    }
    if (character !== '.') continue;

    const beforePeriod = value.slice(start, position).trim();
    const afterPeriod = value.slice(position + 1);
    if (!afterPeriod.trim()) continue;
    if (isListAbbreviation(beforePeriod)) continue;
    if (/^\s+\S/u.test(afterPeriod)) {
      addItem(position);
      start = position + 1;
    }
  }

  addItem(value.length);
  if (!items.length) {
    throw listError(field, index, 'must contain at least one item');
  }
  return items;
}

function buildCombinationKey(areas: string[]): string {
  return areas
    .map(normalize)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .join('|');
}

function assertUniqueSourceId(
  ids: Set<number>,
  id: number,
  type: 'category' | 'combination',
  index: number,
): void {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`Invalid ${type} at index ${index}: id is required`);
  }
  if (ids.has(id)) {
    throw new Error(
      `Invalid report content: duplicate ${type} source id ${id}`,
    );
  }
  ids.add(id);
}

function assertCombinationTitle(
  title: string,
  areas: string[],
  index: number,
): void {
  const titleAreas = title
    .split('+')
    .map((area) => area.trim())
    .filter(Boolean);
  if (
    titleAreas.length !== 3 ||
    buildCombinationKey(titleAreas) !== buildCombinationKey(areas)
  ) {
    throw new Error(
      `Invalid combination at index ${index}: combinacion does not match its areas`,
    );
  }
}

export function validateReportContent(
  rawCategories: unknown,
  rawCombinations: unknown,
): ReportContent {
  if (!Array.isArray(rawCategories) || rawCategories.length !== 12) {
    throw new Error('Invalid report content: expected exactly 12 categories');
  }
  if (!Array.isArray(rawCombinations) || rawCombinations.length !== 220) {
    throw new Error(
      'Invalid report content: expected exactly 220 combinations',
    );
  }

  const categoryKeys = new Set<string>();
  const categorySourceIds = new Set<number>();
  const categories = rawCategories.map((raw, index) => {
    if (!raw || typeof raw !== 'object')
      throw new Error(`Invalid category at index ${index}`);
    const item = raw as RawCategory;
    assertUniqueSourceId(categorySourceIds, item.id, 'category', index);
    const title = requiredString(item.area, 'area', index);
    const key = normalize(title);
    const categoryId = CATEGORY_ID_BY_AREA[key];
    if (!categoryId) {
      throw new Error(`Invalid report content: unknown category area ${title}`);
    }
    if (categoryKeys.has(key)) {
      throw new Error(
        `Invalid report content: duplicate normalized category key ${title}`,
      );
    }
    categoryKeys.add(key);

    return {
      categoryId,
      title,
      description: requiredString(item.descripcion, 'descripcion', index),
      occupations: splitReviewedList(
        requiredString(item.ocupaciones_oficios, 'ocupaciones_oficios', index),
        'ocupaciones_oficios',
        index,
      ),
      formalProfessions: splitReviewedList(
        requiredString(
          item.profesiones_tecnicas_formales,
          'profesiones_tecnicas_formales',
          index,
        ),
        'profesiones_tecnicas_formales',
        index,
      ),
      competencies: splitReviewedList(
        requiredString(item.competencias, 'competencias', index),
        'competencias',
        index,
      ),
    };
  });

  const combinationKeys = new Set<string>();
  const combinationSourceIds = new Set<number>();
  const combinations = rawCombinations.map((raw, index) => {
    if (!raw || typeof raw !== 'object')
      throw new Error(`Invalid combination at index ${index}`);
    const item = raw as RawCombination;
    assertUniqueSourceId(combinationSourceIds, item.id, 'combination', index);
    const area1 = requiredString(item.area_1, 'area_1', index);
    const area2 = requiredString(item.area_2, 'area_2', index);
    const area3 = requiredString(item.area_3, 'area_3', index);
    const areas = [area1, area2, area3];
    const normalizedAreas = areas.map(normalize);
    if (new Set(normalizedAreas).size !== 3) {
      throw new Error(
        `Invalid combination at index ${index}: expected three distinct areas`,
      );
    }
    if (normalizedAreas.some((area) => !categoryKeys.has(area))) {
      throw new Error(
        `Invalid combination at index ${index}: area is not in the category set`,
      );
    }
    const title = requiredString(item.combinacion, 'combinacion', index);
    assertCombinationTitle(title, areas, index);
    const combinationKey = buildCombinationKey(areas);
    if (combinationKeys.has(combinationKey)) {
      throw new Error(
        `Invalid report content: duplicate normalized combination key ${combinationKey}`,
      );
    }
    combinationKeys.add(combinationKey);

    const possibleJobs = requiredString(
      item.ambitos_trabajo,
      'ambitos_trabajo',
      index,
    );
    if (possibleJobs.toUpperCase().includes(CONTAMINATION_MARKER)) {
      throw new Error(
        `Invalid report content at index ${index}: possible jobs contain professions contamination`,
      );
    }

    return {
      title,
      area1,
      area2,
      area3,
      combinationKey,
      narrative: requiredString(item.descripcion, 'descripcion', index),
      keyInsight: requiredString(item.clave, 'clave', index),
      competencies: splitReviewedList(
        requiredString(item.competencias, 'competencias', index),
        'competencias',
        index,
      ),
      possibleJobs: splitReviewedList(possibleJobs, 'ambitos_trabajo', index),
      relatedProfessions: splitReviewedList(
        requiredString(
          item.profesiones_vinculadas,
          'profesiones_vinculadas',
          index,
        ),
        'profesiones_vinculadas',
        index,
      ),
    };
  });

  return { categories, combinations };
}

export function getReportContentPaths(): {
  materialPath: string;
  combinationsPath: string;
} {
  const materialPath = process.env.SEED_MATERIAL_TEORICO_PATH?.trim();
  const combinationsPath = process.env.SEED_TRES_AREAS_PATH?.trim();
  if (materialPath || combinationsPath) {
    if (!materialPath || !combinationsPath) {
      throw new Error(
        'Both SEED_MATERIAL_TEORICO_PATH and SEED_TRES_AREAS_PATH must be set together.',
      );
    }
    return {
      materialPath: resolve(materialPath),
      combinationsPath: resolve(combinationsPath),
    };
  }

  const docsRoots = [
    resolve(process.cwd(), 'docs'),
    resolve(process.cwd(), '..', '..', 'docs'),
  ];
  for (const docsRoot of docsRoots) {
    const resolvedMaterialPath = resolve(docsRoot, MATERIAL_FILE);
    const resolvedCombinationsPath = resolve(docsRoot, COMBINATIONS_FILE);
    if (
      existsSync(resolvedMaterialPath) &&
      existsSync(resolvedCombinationsPath)
    ) {
      return {
        materialPath: resolvedMaterialPath,
        combinationsPath: resolvedCombinationsPath,
      };
    }
  }

  throw new Error(
    `Canonical report content files were not found. Set SEED_MATERIAL_TEORICO_PATH and SEED_TRES_AREAS_PATH, or provide ${MATERIAL_FILE} and ${COMBINATIONS_FILE} in the repository docs directory.`,
  );
}

export async function loadReportContent(): Promise<ReportContent> {
  let paths: { materialPath: string; combinationsPath: string } | undefined;
  try {
    paths = getReportContentPaths();
    const [materialRaw, combinationsRaw] = await Promise.all([
      readFile(paths.materialPath, 'utf8'),
      readFile(paths.combinationsPath, 'utf8'),
    ]);
    return validateReportContent(
      JSON.parse(materialRaw),
      JSON.parse(combinationsRaw),
    );
  } catch (error) {
    const sourcePaths = paths
      ? `${paths.materialPath}, ${paths.combinationsPath}`
      : 'unresolved paths';
    throw new Error(
      `Unable to load canonical report content (${sourcePaths}): ${(error as Error).message}`,
    );
  }
}
