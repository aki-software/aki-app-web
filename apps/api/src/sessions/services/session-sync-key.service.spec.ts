import { SessionSyncKeyService } from './session-sync-key.service.js';

describe('SessionSyncKeyService', () => {
  const service = new SessionSyncKeyService();

  it('uses payload id when available', () => {
    expect(service.buildSyncKey('payload-1', 'user-1', '2024-01-01')).toBe(
      'id:payload-1',
    );
  });

  it('builds key from user and startedAt when id missing', () => {
    expect(service.buildSyncKey(null, 'user-1', '2024-01-01')).toBe(
      'u:user-1:s:2024-01-01',
    );
  });

  it('returns null when required data is missing', () => {
    expect(service.buildSyncKey(null, null, '2024-01-01')).toBeNull();
    expect(service.buildSyncKey(null, 'user-1', undefined)).toBeNull();
  });
});
