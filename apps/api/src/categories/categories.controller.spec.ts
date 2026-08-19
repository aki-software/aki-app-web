import { Reflector } from '@nestjs/core';
import { UserRole } from '@akit/contracts';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { CategoriesController } from './categories.controller.js';

describe('CategoriesController', () => {
  it('requires ADMIN metadata for category updates', () => {
    const controller = new CategoriesController({} as never);
    const roles = new Reflector().get<UserRole[]>(
      ROLES_KEY,
      controller.updateCategory,
    );

    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it('forwards partial structured updates to the service', async () => {
    const updateCategory = jest.fn().mockResolvedValue({ categoryId: 'ART' });
    const controller = new CategoriesController({ updateCategory } as never);

    await expect(
      controller.updateCategory('ART', { competencies: ['Creativity'] }),
    ).resolves.toEqual({ categoryId: 'ART' });
    expect(updateCategory).toHaveBeenCalledWith('ART', {
      competencies: ['Creativity'],
    });
  });
});
