import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { downloadSessionPdf } from '../../../api/sessions.api';
import { VoucherSessionsTable } from '../VoucherSessionsTable';

vi.mock('../../../api/sessions.api', () => ({
  downloadSessionPdf: vi.fn(),
}));

describe('VoucherSessionsTable PDF downloads', () => {
  it('uses the shared session PDF downloader', async () => {
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

    expect(downloadSessionPdf).toHaveBeenCalledWith('session-1');
  });
});
