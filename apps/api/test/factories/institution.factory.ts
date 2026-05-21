import { DataSource } from 'typeorm';
import { Institution } from '../../src/institutions/entities/institution.entity.js';

export async function createInstitutionFactory(
  dataSource: DataSource,
  overrides: Partial<Institution> = {},
): Promise<Institution> {
  const repository = dataSource.getRepository(Institution);
  const institution = repository.create({
    name: 'Test Academy',
    billingEmail: `billing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@academy.com`,
    isActive: true,
    responsibleTherapistUserId: null,
    ...overrides,
  });

  return await repository.save(institution);
}
