import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { PricingPage } from './PricingPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('PricingPage', () => {
  it('renders available plans', () => {
    render(
      <BrowserRouter>
        <PricingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Planes y Precios')).toBeInTheDocument();
    expect(screen.getByText('Básico')).toBeInTheDocument();
    expect(screen.getByText('$5000')).toBeInTheDocument();
    expect(screen.getByText('Profesional')).toBeInTheDocument();
    expect(screen.getByText('$15000')).toBeInTheDocument();
  });

  it('simulates plan selection', async () => {
    render(
      <BrowserRouter>
        <PricingPage />
      </BrowserRouter>
    );

    const buttons = screen.getAllByText('Seleccionar Plan');
    fireEvent.click(buttons[0]);

    expect(screen.getByText('Procesando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/billing');
    }, { timeout: 1500 });
  });
});
