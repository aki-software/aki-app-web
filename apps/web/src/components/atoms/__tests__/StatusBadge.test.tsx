import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, ActivationBadge } from '../StatusBadge';

describe('StatusBadge Atom', () => {
  describe('type: institution', () => {
    it('renders active state with success tokens', () => {
      const { container } = render(<StatusBadge type="institution" isActive={true} />);
      const badge = container.firstChild as HTMLElement;
      
      expect(screen.getByText('Activo')).toBeDefined();
      expect(badge.className).toContain('text-status-success');
      expect(badge.className).toContain('bg-status-success/10');
      expect(badge.className).toContain('border-status-success/30');
    });

    it('renders pending state with warning tokens', () => {
      const { container } = render(<StatusBadge type="institution" isActive={false} />);
      const badge = container.firstChild as HTMLElement;
      
      expect(screen.getByText('Pendiente')).toBeDefined();
      expect(badge.className).toContain('text-status-warning');
      expect(badge.className).toContain('bg-status-warning/10');
      expect(badge.className).toContain('border-status-warning/30');
    });
  });

  describe('type: voucher', () => {
    it('renders AVAILABLE state with success tokens', () => {
      const { container } = render(<StatusBadge type="voucher" status="AVAILABLE" />);
      const badge = container.firstChild as HTMLElement;
      
      expect(screen.getByText('Disponible')).toBeDefined();
      expect(badge.className).toContain('text-status-success');
    });

    it('renders EXPIRED state with error tokens', () => {
      const { container } = render(<StatusBadge type="voucher" status="EXPIRED" />);
      const badge = container.firstChild as HTMLElement;
      
      expect(screen.getByText('Expirado')).toBeDefined();
      expect(badge.className).toContain('text-status-error');
      expect(badge.className).toContain('bg-status-error/10');
    });

    it('renders SENT state with primary tokens', () => {
      const { container } = render(<StatusBadge type="voucher" status="SENT" />);
      const badge = container.firstChild as HTMLElement;
      
      expect(screen.getByText('Enviado')).toBeDefined();
      expect(badge.className).toContain('text-app-primary');
    });
  });
});

describe('ActivationBadge Atom', () => {
  it('renders suspended state with error tokens', () => {
    const { container } = render(<ActivationBadge hasAccount={true} institutionSuspended={true} />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Suspendida')).toBeDefined();
    expect(badge.className).toContain('text-status-error');
  });

  it('renders no account state', () => {
    const { container } = render(<ActivationBadge hasAccount={false} />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Sin cuenta operativa')).toBeDefined();
    expect(badge.className).toContain('text-app-text-muted');
  });

  it('renders active state', () => {
    const { container } = render(<ActivationBadge hasAccount={true} isActive={true} />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Activa')).toBeDefined();
    expect(badge.className).toContain('text-status-success');
  });

  it('renders pending state', () => {
    const { container } = render(<ActivationBadge hasAccount={true} isActive={false} />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Activación pendiente')).toBeDefined();
    expect(badge.className).toContain('text-status-warning');
  });
});
