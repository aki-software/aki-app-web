import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from '../Alert';

describe('Alert Atom', () => {
  it('renders successfully with success type', () => {
    const { container } = render(<Alert type="success" message="Success message" />);
    const alertDiv = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Success message')).toBeDefined();
    expect(alertDiv.getAttribute('role')).toBe('alert');
    expect(alertDiv.className).toContain('bg-status-success/10');
    expect(alertDiv.className).toContain('text-status-success');
    expect(alertDiv.className).toContain('border-status-success/30');
  });

  it('renders successfully with error type', () => {
    const { container } = render(<Alert type="error" message="Error message" />);
    const alertDiv = container.firstChild as HTMLElement;
    
    expect(alertDiv.className).toContain('bg-status-error/10');
    expect(alertDiv.className).toContain('text-status-error');
  });

  it('renders successfully with warning type', () => {
    const { container } = render(<Alert type="warning" message="Warning message" />);
    const alertDiv = container.firstChild as HTMLElement;
    
    expect(alertDiv.className).toContain('bg-status-warning/10');
    expect(alertDiv.className).toContain('text-status-warning');
  });

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<Alert type="success" message="Test" onClose={onCloseMock} />);
    
    const closeBtn = screen.getByLabelText('Cerrar alerta');
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledOnce();
  });

  it('returns null if no message is provided', () => {
    const { container } = render(<Alert type="success" message="" />);
    expect(container.firstChild).toBeNull();
  });
});
