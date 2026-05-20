import { User } from './entities/user.entity.js';

/**
 * Checks if the user has a configured password.
 */
export function hasPasswordConfigured(user: User): boolean {
  return !!user.passwordSetAt && user.passwordHash.startsWith('scrypt$');
}
