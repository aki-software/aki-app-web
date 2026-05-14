import { UserRole } from '../../users/entities/user.entity.js';

export function normalizeUserRole(role?: UserRole | string): UserRole {
  const normalized = role?.toString().trim().toUpperCase();
  if (normalized === UserRole.ADMIN) {
    return UserRole.ADMIN;
  }
  if (normalized === UserRole.INSTITUTION_ADMIN) {
    return UserRole.INSTITUTION_ADMIN;
  }
  if (normalized === UserRole.PATIENT || normalized === 'PACIENTE') {
    return UserRole.PATIENT;
  }
  return UserRole.THERAPIST;
}
