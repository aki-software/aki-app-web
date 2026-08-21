import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_URL } from '../../../../api/client';
import { downloadSessionPdf } from '../sessions.api';
import { getStoredToken } from '../../../../utils/storage';

vi.mock('../../../../utils/storage', () => ({
  getStoredToken: vi.fn(),
}));

describe('downloadSessionPdf', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the authenticated session report route and returns the private PDF blob', async () => {
    vi.mocked(getStoredToken).mockReturnValue('access-token');
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(blob),
    } as unknown as Response);

    await expect(downloadSessionPdf('session-1')).resolves.toEqual(blob);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/reports/sessions/session-1/download`,
      { headers: { Authorization: 'Bearer access-token' } },
    );
  });

  it('surfaces an unavailable report error from the session route', async () => {
    vi.mocked(getStoredToken).mockReturnValue(null);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ message: 'Report is pending generation.' }),
    } as unknown as Response);

    await expect(downloadSessionPdf('session-1')).rejects.toThrow(
      'Report is pending generation.',
    );
  });
});
