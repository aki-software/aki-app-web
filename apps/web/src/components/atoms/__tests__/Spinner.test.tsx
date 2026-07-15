import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';

describe('Spinner Atom', () => {
  it('renders correctly with default size', () => {
    const { container } = render(<Spinner />);
    const spinnerElement = container.firstChild as HTMLElement;
    
    // Checks border color and spin animation 
    expect(spinnerElement.className).toContain('border-t-app-primary');
    expect(spinnerElement.className).toContain('animate-spin');
    
    // Checks accessibility
    expect(spinnerElement.getAttribute('role')).toBe('status');
    expect(spinnerElement.getAttribute('aria-label')).toBe('Cargando...');
    expect(screen.getByText('Cargando...')).toBeDefined();
  });

  it('applies custom size classes', () => {
    const { container } = render(<Spinner size="lg" />);
    const spinnerElement = container.firstChild as HTMLElement;
    
    expect(spinnerElement.className).toContain('w-12 h-12');
  });

  it('merges custom className', () => {
    const { container } = render(<Spinner className="custom-class" />);
    const spinnerElement = container.firstChild as HTMLElement;
    
    expect(spinnerElement.className).toContain('custom-class');
  });
});
