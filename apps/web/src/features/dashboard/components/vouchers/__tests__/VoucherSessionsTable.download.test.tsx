import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { downloadSessionPdf } from '../../../api/sessions.api';
import { VoucherSessionsTable } from '../VoucherSessionsTable';

vi.mock('../../../api/sessions.api', () => ({
  downloadSessionPdf: vi.fn(),
}));

describe('VoucherSessionsTable PDF downloads', () => {
  it('appends and clicks the download anchor before delaying URL revocation', async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn().mockReturnValue('blob:report');
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.mocked(downloadSessionPdf).mockResolvedValue(
      new Blob(['pdf'], { type: 'application/pdf' }),
    );

    render(
      <VoucherSessionsTable
        voucherId="voucher-1"
        loading={false}
        sessions={[
          {
            id: 'session-1',
            patientName: 'Patient One',
            hollandCode: 'RIA',
            sessionDate: '2024-01-15',
            totalTimeMs: 1800000,
            paymentStatus: 'PAID',
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTitle('Descargar reporte'));

    await Promise.resolve();
    await Promise.resolve();
    expect(downloadSessionPdf).toHaveBeenCalledWith('session-1');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
    vi.useRealTimers();
    vi.unstubAllGlobals();
    click.mockRestore();
  });
});
