import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BottomSheet } from './bottom-sheet';
import '@testing-library/jest-dom';

describe('BottomSheet', () => {
  it('renders children when isOpen is true', () => {
    render(
      <BottomSheet isOpen={true} onClose={() => {}}>
        <div data-testid="content">Hello World</div>
      </BottomSheet>
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('does not render children when isOpen is false', () => {
    render(
      <BottomSheet isOpen={false} onClose={() => {}}>
        <div data-testid="content">Hello World</div>
      </BottomSheet>
    );
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={handleClose}>
        <div>Content</div>
      </BottomSheet>
    );
    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
