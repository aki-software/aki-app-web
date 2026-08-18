import { CategoriesService } from './categories.service.js';

describe('CategoriesService', () => {
  const category = {
    id: 'category-1',
    categoryId: 'ART',
    title: 'Artístico',
    description: 'Original description',
    occupations: ['Painter'],
    formalProfessions: ['Designer'],
    competencies: ['Creativity'],
  };

  it('updates only supplied structured fields and returns them', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({ ...category }),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const service = new CategoriesService(repo as never);

    await expect(
      service.updateCategory('ART', { occupations: ['Illustrator'] }),
    ).resolves.toEqual({
      categoryId: 'ART',
      title: 'Artístico',
      description: 'Original description',
      occupations: ['Illustrator'],
      formalProfessions: ['Designer'],
      competencies: ['Creativity'],
    });
    expect(repo.save).toHaveBeenCalledWith({
      ...category,
      occupations: ['Illustrator'],
    });
  });

  it('returns structured category fields from findAll', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([category]),
    };
    const service = new CategoriesService(repo as never);

    await expect(service.findAll()).resolves.toEqual([
      {
        categoryId: 'ART',
        title: 'Artístico',
        description: 'Original description',
        occupations: ['Painter'],
        formalProfessions: ['Designer'],
        competencies: ['Creativity'],
      },
    ]);
  });
});
