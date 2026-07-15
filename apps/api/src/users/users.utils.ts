import { User } from './entities/user.entity.js';

/**
 * Checks if the user has a configured password.
 */
export function hasPasswordConfigured(user: User): boolean {
  if (!user.passwordSetAt || !user.passwordHash) return false;

  return (
    user.passwordHash.startsWith('$2b$') ||
    user.passwordHash.startsWith('$2a$') ||
    user.passwordHash.startsWith('$2y$') ||
    user.passwordHash.startsWith('scrypt$')
  );
}
