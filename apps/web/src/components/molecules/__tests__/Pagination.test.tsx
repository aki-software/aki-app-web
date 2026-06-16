import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

describe('Pagination Component', () => {
  it('renders null when totalPages <= 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders page number buttons for each page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />
    );
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('marks the active page with aria-current', () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={() => {}} />
    );
    const activeButton = screen.getByText('3').closest('button');
    expect(activeButton).toHaveAttribute('aria-current', 'page');
  });

  it('does not set aria-current on inactive pages', () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={() => {}} />
    );
    const inactiveButton = screen.getByText('1').closest('button');
    expect(inactiveButton).not.toHaveAttribute('aria-current');
  });

  it('disables previous button on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />
    );
    const prevButton = screen.getByText('Anterior').closest('button');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />
    );
    const nextButton = screen.getByText('Siguiente').closest('button');
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when clicking a page number', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByText('3'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange when clicking previous and next buttons', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByText('Anterior'));
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByText('Siguiente'));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});
