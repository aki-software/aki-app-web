import { DataSource } from 'typeorm';
import { User, UserRole } from '../../src/users/entities/user.entity.js';

export async function createUserFactory(
  dataSource: DataSource,
  overrides: Partial<User> = {},
): Promise<User> {
  const repository = dataSource.getRepository(User);
  const user = repository.create({
    name: 'Test Therapist',
    email: `therapist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`,
    passwordHash: '$2b$10$xyzFakeHashForTestingOnly',
    role: UserRole.THERAPIST,
    passwordSetupToken: null,
    passwordSetupExpiresAt: null,
    passwordSetAt: new Date(),
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    institutionId: null,
    ...overrides,
  });

  return await repository.save(user);
}
