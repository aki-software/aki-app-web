import { requireFirebaseProjectId } from './firebase-project-id';

describe('requireFirebaseProjectId', () => {
  it('rejects startup configuration without an allowlisted project', () => {
    expect(() => requireFirebaseProjectId({})).toThrow('FIREBASE_PROJECT_ID');
  });
});
