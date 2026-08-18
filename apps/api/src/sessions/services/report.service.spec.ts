import { ReportService } from './report.service.js';
import { Session } from '../entities/session.entity.js';

describe('ReportService', () => {
  let service: ReportService;
  let categoriesRepositoryMock: unknown;
  let tresAreasServiceMock: unknown;

  beforeEach(() => {
    categoriesRepositoryMock = {
      find: jest.fn().mockResolvedValue([]),
    };
    tresAreasServiceMock = {
      findByCategories: jest.fn().mockResolvedValue(null),
    };

    service = new ReportService(
      categoriesRepositoryMock as never,
      tresAreasServiceMock as never,
    );
  });

  it('propagates canonical competencies and keyInsight into the report triplet', async () => {
    categoriesRepositoryMock = {
      find: jest.fn().mockResolvedValue([
        { categoryId: 'ART', title: 'ARTÍSTICO', description: 'description' },
        { categoryId: 'HUM', title: 'HUMANITARIO', description: 'description' },
        { categoryId: 'PROT', title: 'PROTECCIÓN', description: 'description' },
      ]),
    };
    tresAreasServiceMock = {
      findByCategories: jest.fn().mockResolvedValue({
        title: 'ARTÍSTICO + HUMANITARIO + PROTECCIÓN',
        narrative: 'narrative',
        keyInsight: 'key insight',
        competencies: ['competency'],
        tendencies: ['legacy tendency'],
        possibleJobs: 'job',
        relatedProfessions: 'profession',
        customSections: [],
      }),
    };
    service = new ReportService(
      categoriesRepositoryMock as never,
      tresAreasServiceMock as never,
    );

    const reportData = await service.buildReportData({
      patientName: 'Test Patient',
      results: [
        { categoryId: 'ART', percentage: 90 },
        { categoryId: 'HUM', percentage: 80 },
        { categoryId: 'PROT', percentage: 70 },
      ],
    } as unknown as Session);

    expect(reportData.tripletInsight).toMatchObject({
      keyInsight: 'key insight',
      competencies: ['competency'],
    });
  });

  it('builds PDF-ready blocks and strengths from canonical category arrays', async () => {
    categoriesRepositoryMock = {
      find: jest.fn().mockResolvedValue([
        {
          categoryId: 'ART',
          title: 'ARTÍSTICO',
          description: 'canonical description',
          occupations: ['Illustrator'],
          formalProfessions: ['Fine arts degree'],
          competencies: ['Visual communication'],
        },
      ]),
    };
    service = new ReportService(
      categoriesRepositoryMock as never,
      tresAreasServiceMock as never,
    );

    const reportData = await service.buildReportData({
      patientName: 'Test Patient',
      results: [{ categoryId: 'ART', percentage: 90 }],
    } as unknown as Session);

    expect(reportData.topResults[0].parsedBlocks).toEqual([
      { subtitle: 'Descripción breve', content: 'canonical description' },
      expect.objectContaining({ subtitle: 'Ocupaciones y oficios', list: ['Illustrator'] }),
      expect.objectContaining({ subtitle: 'Profesiones técnicas o formales', list: ['Fine arts degree'] }),
      expect.objectContaining({ subtitle: 'Competencias importantes', list: ['Visual communication'] }),
    ]);
    expect(reportData.strengths).toEqual(['Visual communication']);
  });

  it('falls back to legacy description parsing when structured arrays are absent', async () => {
    categoriesRepositoryMock = {
      find: jest.fn().mockResolvedValue([
        {
          categoryId: 'ART',
          title: 'ARTÍSTICO',
          description: 'Competencias importantes: Legacy competency',
        },
      ]),
    };
    service = new ReportService(
      categoriesRepositoryMock as never,
      tresAreasServiceMock as never,
    );

    const reportData = await service.buildReportData({
      patientName: 'Test Patient',
      results: [{ categoryId: 'ART', percentage: 90 }],
    } as unknown as Session);

    expect(reportData.topResults[0].parsedBlocks).toEqual([
      { subtitle: 'Competencias importantes para desempeñarse en el área', content: 'Legacy competency' },
    ]);
    expect(reportData.strengths).toEqual(['Legacy competency']);
  });

  it('should preserve session.results order as-is (single source of truth)', async () => {
    // El orden ya viene establecido por el motor psicométrico.
    // report.service NO debe re-ordenar, solo tomar los primeros 3.
    const session = {
      patientName: 'Test Patient',
      results: [
        { categoryId: 'B', percentage: 90, timeSpentMs: 2000 },
        { categoryId: 'C', percentage: 80, timeSpentMs: 15000 },
        { categoryId: 'A', percentage: 80, timeSpentMs: 5000 },
      ],
    } as unknown as Session;

    const reportData = await service.buildReportData(session);

    // Debe respetar el orden tal como viene — sin re-ordenar.
    expect(reportData.topResults[0].title).toBe('B');
    expect(reportData.topResults[1].title).toBe('C');
    expect(reportData.topResults[2].title).toBe('A');
  });
});
