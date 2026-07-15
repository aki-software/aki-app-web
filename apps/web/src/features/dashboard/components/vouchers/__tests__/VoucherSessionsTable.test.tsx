import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoucherSessionsTable } from '../VoucherSessionsTable';

function createSession(id: string) {
  return {
    id,
    patientName: `Patient ${id}`,
    hollandCode: 'RIA',
    sessionDate: '2024-01-15',
    totalTimeMs: 1800000,
    paymentStatus: 'PAID',
  };
}

describe('VoucherSessionsTable', () => {
  it('paginates 25 sessions, showing 10 on page 1', () => {
    const sessions = Array.from({ length: 25 }, (_, i) => createSession(String(i + 1)));
    render(<VoucherSessionsTable voucherId="v1" sessions={sessions} loading={false} />);
    expect(screen.getByText('Patient 1')).toBeInTheDocument();
    expect(screen.getByText('Patient 10')).toBeInTheDocument();
    expect(screen.queryByText('Patient 11')).not.toBeInTheDocument();
  });

  it('navigates to page 2 and shows sessions 11-20', () => {
    const sessions = Array.from({ length: 25 }, (_, i) => createSession(String(i + 1)));
    render(<VoucherSessionsTable voucherId="v1" sessions={sessions} loading={false} />);
    fireEvent.click(screen.getByText('2'));
    expect(screen.queryByText('Patient 10')).not.toBeInTheDocument();
    expect(screen.getByText('Patient 11')).toBeInTheDocument();
    expect(screen.getByText('Patient 20')).toBeInTheDocument();
    expect(screen.queryByText('Patient 21')).not.toBeInTheDocument();
  });

  it('shows all sessions when fewer than page size and no pagination controls', () => {
    const sessions = Array.from({ length: 3 }, (_, i) => createSession(String(i + 1)));
    render(<VoucherSessionsTable voucherId="v1" sessions={sessions} loading={false} />);
    expect(screen.getByText('Patient 1')).toBeInTheDocument();
    expect(screen.getByText('Patient 3')).toBeInTheDocument();
    expect(screen.queryByText('Siguiente')).not.toBeInTheDocument();
  });
});
