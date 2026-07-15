import { ReportService } from './report.service.js';
import { Session } from '../entities/session.entity.js';

describe('ReportService', () => {
  let service: ReportService;
  let categoriesRepositoryMock: any;
  let tresAreasServiceMock: any;

  beforeEach(() => {
    categoriesRepositoryMock = {
      find: jest.fn().mockResolvedValue([]),
    };
    tresAreasServiceMock = {
      findByCategories: jest.fn().mockResolvedValue(null),
    };

    service = new ReportService(categoriesRepositoryMock, tresAreasServiceMock);
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
