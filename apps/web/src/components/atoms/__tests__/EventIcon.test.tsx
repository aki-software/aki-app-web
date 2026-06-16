import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EventIcon } from '../EventIcon';

describe('EventIcon Atom', () => {
  it('renders VOUCHER_REDEEMED with success tokens and aria-hidden', () => {
    const { container } = render(<EventIcon type="VOUCHER_REDEEMED" />);
    const icon = container.querySelector('svg');
    
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.className.baseVal).toContain('text-status-success');
  });

  it('renders SESSION_COMPLETED with success tokens', () => {
    const { container } = render(<EventIcon type="SESSION_COMPLETED" />);
    const icon = container.querySelector('svg');
    
    expect(icon?.className.baseVal).toContain('text-status-success');
  });

  it('renders SESSION_STARTED with warning tokens', () => {
    const { container } = render(<EventIcon type="SESSION_STARTED" />);
    const icon = container.querySelector('svg');
    
    expect(icon?.className.baseVal).toContain('text-status-warning');
  });

  it('renders VOUCHER_ISSUED with primary tokens', () => {
    const { container } = render(<EventIcon type="VOUCHER_ISSUED" />);
    const icon = container.querySelector('svg');
    
    expect(icon?.className.baseVal).toContain('text-app-primary');
  });

  it('falls back to default icon and tokens for unknown type', () => {
    // @ts-expect-error Testing fallback
    const { container } = render(<EventIcon type="UNKNOWN_TYPE" />);
    const icon = container.querySelector('svg');
    
    expect(icon?.className.baseVal).toContain('text-app-text-muted');
  });

  it('merges custom className', () => {
    const { container } = render(<EventIcon type="SESSION_STARTED" className="custom-icon h-8 w-8" />);
    const icon = container.querySelector('svg');
    
    expect(icon?.className.baseVal).toContain('custom-icon');
    expect(icon?.className.baseVal).toContain('h-8');
    expect(icon?.className.baseVal).toContain('w-8');
  });
});
