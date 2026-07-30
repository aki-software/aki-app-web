import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { BillingDashboard } from './BillingDashboard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('BillingDashboard', () => {
  it('renders the billing dashboard with plans, vouchers, and transactions', () => {
    render(
      <BrowserRouter>
        <BillingDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Facturación y Consumo')).toBeInTheDocument();
    expect(screen.getByText('Profesional')).toBeInTheDocument();
    expect(screen.getByText('12 / 20')).toBeInTheDocument();
    expect(screen.getByText('8 Sesiones')).toBeInTheDocument();
    expect(screen.getByText('Historial de Transacciones')).toBeInTheDocument();
    expect(screen.getAllByText('Plan Profesional').length).toBeGreaterThan(0);
  });

  it('navigates to pricing page when Cambiar Plan is clicked', () => {
    render(
      <BrowserRouter>
        <BillingDashboard />
      </BrowserRouter>
    );

    const button = screen.getByText('Cambiar Plan');
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith('/pricing');
  });
});
