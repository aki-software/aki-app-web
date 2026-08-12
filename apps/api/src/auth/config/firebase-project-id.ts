import { AUTH_JWT_MESSAGES } from '../auth.constants.js';

export function requireFirebaseProjectId(environment: {
  FIREBASE_PROJECT_ID?: unknown;
}): string {
  const projectId =
    typeof environment.FIREBASE_PROJECT_ID === 'string'
      ? environment.FIREBASE_PROJECT_ID.trim()
      : '';

  if (!projectId) {
    throw new Error(AUTH_JWT_MESSAGES.firebaseProjectIdMissing);
  }

  return projectId;
}
