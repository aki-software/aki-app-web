import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { BrowserRouter } from 'react-router-dom';
import { StatCard } from '../components/atoms/StatCard';
import { Alert } from '../components/atoms/Alert';
import { EventIcon } from '../components/atoms/EventIcon';
import { Modal } from '../components/atoms/Modal';

/**
 * Spec: Accessibility Foundation — Requirement: Decorative Icon Marking
 *
 * All decorative Lucide icons MUST have `aria-hidden="true"` to hide them
 * from assistive technology. Close buttons with icons MUST have aria-label
 * providing accessible names.
 */

// Sidebar needs auth + navigation context
vi.mock('../features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'ADMIN' },
    logout: vi.fn(),
  }),
}));

describe('Decorative icons — aria-hidden', () => {
  // ── Task 3.2: StatCard decorative icon ──
  describe('StatCard', () => {
    it('should render icon SVG with aria-hidden="true" when LucideIcon is passed', () => {
      const { container } = render(
        <StatCard icon={Activity} label="Total Events" value={150} />,
      );
      const svgs = container.querySelectorAll('svg');

      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should render icon with aria-hidden="true" when ReactNode is passed', () => {
      const { container } = render(
        <StatCard
          icon={<Activity data-testid="reactnode-icon" className="h-5 w-5 text-status-success" />}
          label="Test"
          value={1}
        />,
      );
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  // ── Task 3.2: Alert icons (already implemented — regression check) ──
  describe('Alert', () => {
    it('should render main icon SVG with aria-hidden="true"', () => {
      const { container } = render(<Alert type="error" message="Test error" />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should have accessible label on close button', () => {
      render(<Alert type="success" message="Great!" onClose={() => {}} />);
      expect(screen.getByLabelText('Cerrar alerta')).toBeDefined();
    });
  });

  // ── Task 3.2: EventIcon (already implemented — regression check) ──
  describe('EventIcon', () => {
    it('should render icon with aria-hidden="true"', () => {
      const { container } = render(<EventIcon type="VOUCHER_REDEEMED" />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  // ── Task 3.5: Close button accessible labels ──
  describe('Close buttons — aria-label', () => {
    it('should have aria-label on Modal close button', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <div>Content</div>
        </Modal>,
      );
      expect(screen.getByLabelText('Cerrar modal')).toBeDefined();
    });
  });

  // ── Task 3.2: Sidebar nav icons + LogOut (needs Router) ──
  describe('Sidebar', () => {
    it('should render nav icons with aria-hidden="true"', async () => {
      const { Sidebar } = await import('../features/dashboard/components/Sidebar');
      const { container } = render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>,
      );

      // Sidebar renders nav icons via <item.icon className="..." />
      // and a LogOut icon. All SVGs should have aria-hidden.
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should render navigation link text alongside each icon', async () => {
      const { Sidebar } = await import('../features/dashboard/components/Sidebar');
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>,
      );
      // Nav items have visible text labels: Resumen, Tests realizados, Vouchers, etc.
      expect(screen.getByText('Resumen')).toBeDefined();
      expect(screen.getByText('Vouchers')).toBeDefined();
    });

    it('should have label text on logout button', async () => {
      const { Sidebar } = await import('../features/dashboard/components/Sidebar');
      render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>,
      );
      expect(screen.getByText('Cerrar sesión')).toBeDefined();
    });
  });
});
