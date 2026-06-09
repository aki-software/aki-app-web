import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LowStockAlert } from '../components/institucion/LowStockAlert';
import { QuickActions } from '../components/overview/QuickActions';

// Mock lucide-react to avoid icon rendering issues
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  X: () => <span data-testid="icon-x" />,
  Plus: () => <span data-testid="icon-plus" />,
  Search: () => <span data-testid="icon-search" />,
  HelpCircle: () => <span data-testid="icon-help" />,
}));

function withRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('Feature Color Approval Tests', () => {

  // ── Task 2.5: LowStockAlert ──
  describe('LowStockAlert', () => {
    it('should render alert with stock count and message', () => {
      withRouter(
        <LowStockAlert
          available={3}
          threshold={10}
          onDismiss={() => {}}
          onNavigate={() => {}}
        />
      );
      expect(screen.getByText('Alerta de consumo')).toBeDefined();
      expect(screen.getByText(/Quedan 3 voucher/)).toBeDefined();
      expect(screen.getByText(/Mínimo recomendado: 10/)).toBeDefined();
    });

    it('should render dismiss button with aria-label', () => {
      withRouter(
        <LowStockAlert
          available={1}
          threshold={5}
          onDismiss={() => {}}
          onNavigate={() => {}}
        />
      );
      expect(screen.getByLabelText('Cerrar alerta de bajo stock')).toBeDefined();
    });

    it('should render navigation button', () => {
      withRouter(
        <LowStockAlert
          available={2}
          threshold={8}
          onDismiss={() => {}}
          onNavigate={() => {}}
        />
      );
      expect(screen.getByText('Ver vouchers')).toBeDefined();
    });
  });

  // ── Task 2.7: QuickActions ──
  describe('QuickActions', () => {
    it('should render admin actions when isAdmin is true', () => {
      withRouter(<QuickActions isAdmin={true} />);
      expect(screen.getByText('Emitir lotes')).toBeDefined();
      expect(screen.getByText('Buscar sesiones')).toBeDefined();
      expect(screen.getByText('Centro de soporte')).toBeDefined();
    });

    it('should render non-admin actions when isAdmin is false', () => {
      withRouter(<QuickActions isAdmin={false} />);
      expect(screen.queryByText('Emitir lotes')).toBeNull();
      expect(screen.getByText('Buscar sesiones')).toBeDefined();
      expect(screen.getByText('Cambio de contraseña')).toBeDefined();
    });
  });
});
