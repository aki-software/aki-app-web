import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VocationalCategory } from '../../categories/entities/vocational-category.entity';
import { TresAreasService } from '../../common/services/tres-areas.service';
import { Session } from '../entities/session.entity';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;

  const mockCategoryRepo = {
    find: jest.fn(),
  };

  const mockTresAreasService = {
    findByCategories: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: getRepositoryToken(VocationalCategory),
          useValue: mockCategoryRepo,
        },
        {
          provide: TresAreasService,
          useValue: mockTresAreasService,
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    mockCategoryRepo.find.mockReset();
    mockTresAreasService.findByCategories.mockReset();
  });

  it('builds report data with top 3 sorted results', async () => {
    mockCategoryRepo.find.mockResolvedValue([
      {
        categoryId: 'ART',
        title: 'Artistico',
        description: 'Descripcion breve: Creatividad aplicada.',
      },
      {
        categoryId: 'HUM',
        title: 'Humanitario',
        description: 'Descripcion breve: Interes social.',
      },
      {
        categoryId: 'SERV',
        title: 'Servicios',
        description: 'Descripcion breve: Vocacion de servicio.',
      },
    ]);

    mockTresAreasService.findByCategories.mockResolvedValue({
      id: 'comb-1',
      title: 'Artistico + Humanitario + Servicios',
      categories: ['Artistico', 'Humanitario', 'Servicios'],
      narrative: 'Narrativa combinada',
      tendencies: ['Ayuda', 'Creatividad'],
      possibleJobs: 'A, B',
      relatedProfessions: 'C, D',
    });

    const session = {
      patientName: 'Paciente Test',
      hollandCode: 'AHS',
      results: [
        { categoryId: 'HUM', percentage: 70, suggestedCareers: ['TS'] },
        { categoryId: 'SERV', percentage: 65, suggestedCareers: ['ENF'] },
        { categoryId: 'ART', percentage: 90, suggestedCareers: ['DIS'] },
      ],
    } as Session;

    const report = await service.buildReportData(session);

    expect(report.patientName).toBe('Paciente Test');
    expect(report.hollandCode).toBe('AHS');
    expect(report.topResults).toHaveLength(3);
    expect(report.topResults[0].title).toBe('Artistico');
    expect(report.topResults[0].percentage).toBe(90);
    expect(report.summary.primaryTitle).toBe('Artistico');
    expect(report.tripletInsight?.title).toBe(
      'Artistico + Humanitario + Servicios',
    );
    expect(report.tripletInsight?.possibleJobs).toEqual(['A', 'B']);
    expect(report.tripletInsight?.relatedProfessions).toEqual(['C', 'D']);
  });
});
