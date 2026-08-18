import { TresAreasService } from './tres-areas.service.js';

describe('TresAreasService', () => {
  const combination = {
    id: 'combination-1',
    narrative: 'Narrative',
    tendencies: ['Legacy tendency'],
    competencies: ['Canonical competency'],
    keyInsight: 'Original insight',
    possibleJobs: 'Job',
    relatedProfessions: 'Profession',
    customSections: [],
  };

  it('uses canonical competencies when both canonical and legacy fields are supplied', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({ ...combination }),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const service = new TresAreasService(repo as never);

    await expect(
      service.update('combination-1', {
        competencies: ['Updated competency'],
        tendencies: ['Legacy value'],
        keyInsight: 'Updated insight',
      }),
    ).resolves.toMatchObject({
      competencies: ['Updated competency'],
      tendencies: ['Updated competency'],
      keyInsight: 'Updated insight',
    });
  });

  it('maps legacy tendencies to canonical competencies for backwards compatibility', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({ ...combination }),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const service = new TresAreasService(repo as never);

    await expect(
      service.update('combination-1', { tendencies: ['Legacy update'] }),
    ).resolves.toMatchObject({
      competencies: ['Legacy update'],
      tendencies: ['Legacy update'],
    });
  });
});
