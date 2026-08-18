import {
  loadReportContent,
  splitReviewedList,
  validateReportContent,
} from './report-content-loader.js';

const AREAS = [
  'Artístico',
  'Humanitario',
  'Servicios y Acomodación',
  'Protección',
  'Desempeño físico',
  'Industrial',
  'Mecánica',
  'Plantas y animales',
  'Liderazgo',
  'Científico',
  'Ventas',
  'Negocios y detalle',
];

function canonicalSource() {
  const categories = AREAS.map((area, index) => ({
    id: index + 1,
    area,
    descripcion: 'description',
    ocupaciones_oficios: 'JOB',
    profesiones_tecnicas_formales: 'PROFESSION',
    competencias: 'COMPETENCY',
  }));
  const combinations = AREAS.flatMap((area1, firstIndex) =>
    AREAS.slice(firstIndex + 1).flatMap((area2, secondOffset) =>
      AREAS.slice(firstIndex + secondOffset + 2).map((area3) => ({
        id: 0,
        combinacion: `${area1} + ${area2} + ${area3}`,
        area_1: area1,
        area_2: area2,
        area_3: area3,
        descripcion: 'description',
        competencias: 'COMPETENCY',
        ambitos_trabajo: 'JOB',
        profesiones_vinculadas: 'PROFESSION',
        clave: 'insight',
      })),
    ),
  ).map((combination, index) => ({ ...combination, id: index + 1 }));

  return { categories, combinations };
}

describe('report-content-loader', () => {
  it('splits reviewed comma- and period-delimited lists without truncating abbreviations', () => {
    expect(splitReviewedList('ARTISTA, LIC. EN PSICOLOGÍA. PC. OPERADOR', 'competencias', 0)).toEqual([
      'ARTISTA',
      'LIC. EN PSICOLOGÍA',
      'PC. OPERADOR',
    ]);
  });

  it('rejects empty, contaminated, and ambiguous reviewed lists', () => {
    expect(() => splitReviewedList('ARTISTA,, DISEÑADOR', 'competencias', 0)).toThrow('empty item');
    expect(() => splitReviewedList('ARTISTA *ALGUNAS PROFESIONES VINCULADAS:*', 'competencias', 0)).toThrow('contamination');
    expect(() => splitReviewedList('LIC.', 'competencias', 0)).toThrow('ambiguous');
  });

  it('loads the complete canonical 12-category and 220-combination source', async () => {
    await expect(loadReportContent()).resolves.toEqual(
      expect.objectContaining({
        categories: expect.any(Array),
        combinations: expect.any(Array),
      }),
    );
    const content = await loadReportContent();
    expect(content.categories).toHaveLength(12);
    expect(content.combinations).toHaveLength(220);
  });

  it('maps canonical areas to stable IDs instead of source order', () => {
    const { categories, combinations } = canonicalSource();
    [categories[0], categories[1]] = [categories[1], categories[0]];

    const content = validateReportContent(categories, combinations);

    expect(content.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Artístico', categoryId: 'ART' }),
        expect.objectContaining({ title: 'Humanitario', categoryId: 'HUM' }),
      ]),
    );
    expect(new Set(content.combinations.map((item) => item.combinationKey)).size).toBe(220);
  });

  it('rejects invalid source identities and area triples', () => {
    const { categories, combinations } = canonicalSource();
    categories[1].id = categories[0].id;
    expect(() => validateReportContent(categories, combinations)).toThrow('duplicate category source id');

    const duplicateCombinationId = canonicalSource();
    duplicateCombinationId.combinations[1].id = duplicateCombinationId.combinations[0].id;
    expect(() => validateReportContent(duplicateCombinationId.categories, duplicateCombinationId.combinations)).toThrow('duplicate combination source id');

    const duplicateArea = canonicalSource();
    duplicateArea.combinations[0].area_3 = duplicateArea.combinations[0].area_1;
    expect(() => validateReportContent(duplicateArea.categories, duplicateArea.combinations)).toThrow('three distinct areas');
  });

  it('rejects unknown areas, mismatched titles, and possible-job contamination', () => {
    const unknownArea = canonicalSource();
    unknownArea.categories[0].area = 'Unknown';
    expect(() => validateReportContent(unknownArea.categories, unknownArea.combinations)).toThrow('unknown category area');

    const mismatchedTitle = canonicalSource();
    mismatchedTitle.combinations[0].combinacion = 'Artístico + Humanitario + Ventas';
    expect(() => validateReportContent(mismatchedTitle.categories, mismatchedTitle.combinations)).toThrow('does not match its areas');

    const contaminated = canonicalSource();
    contaminated.combinations[0].ambitos_trabajo = '*ALGUNAS PROFESIONES VINCULADAS:*';
    expect(() => validateReportContent(contaminated.categories, contaminated.combinations)).toThrow('contamination');
  });
});
