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

  it('should use timeSpentMs as tie-breaker when percentages are equal', async () => {
    const session = {
      patientName: 'Test Patient',
      results: [
        { categoryId: 'A', percentage: 80, timeSpentMs: 5000 },
        { categoryId: 'B', percentage: 90, timeSpentMs: 2000 },
        { categoryId: 'C', percentage: 80, timeSpentMs: 15000 }, // Tied with A, but spent more time
      ],
    } as unknown as Session;

    const reportData = await service.buildReportData(session);

    // Expected order:
    // 1. B (90%)
    // 2. C (80% - 15000ms)
    // 3. A (80% - 5000ms)
    expect(reportData.topResults[0].title).toBe('B');
    expect(reportData.topResults[1].title).toBe('C');
    expect(reportData.topResults[2].title).toBe('A');
  });
});
