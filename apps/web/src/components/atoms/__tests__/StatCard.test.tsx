import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';
import { Activity } from 'lucide-react';

describe('StatCard Component', () => {
  it('should render label and value', () => {
    render(
      <StatCard 
        icon={Activity} 
        label="Total Events" 
        value={150} 
      />
    );
    expect(screen.getByText('Total Events')).toBeDefined();
    expect(screen.getByText('150')).toBeDefined();
  });

  it('should render unit when provided', () => {
    render(
      <StatCard 
        icon={Activity} 
        label="Success Rate" 
        value="95" 
        unit="%"
      />
    );
    expect(screen.getByText('%')).toBeDefined();
  });

  it('should render description when provided', () => {
    render(
      <StatCard 
        icon={Activity} 
        label="Vouchers" 
        value={42} 
        description="Total de vouchers emitidos en el periodo."
      />
    );
    expect(screen.getByText('Total de vouchers emitidos en el periodo.')).toBeDefined();
  });

  it('should apply custom className to the outer card', () => {
    render(
      <StatCard 
        icon={Activity} 
        label="Stats" 
        value={100} 
        className="rounded-2xl border border-app-primary/20"
      />
    );
    const card = screen.getByText('100').closest('.app-card');
    expect(card?.className).toContain('rounded-2xl');
    expect(card?.className).toContain('border-app-primary/20');
  });

  it('should accept icon as ReactNode element', () => {
    render(
      <StatCard 
        icon={<Activity data-testid="reactnode-icon" className="h-5 w-5 text-status-success" />}
        label="Test" 
        value={1} 
      />
    );
    // Icon renders in 2 places: background decoration + icon container
    const icons = screen.getAllByTestId('reactnode-icon');
    expect(icons).toHaveLength(2);
  });

  it('should accept valueColor as alias for colorClass', () => {
    render(
      <StatCard 
        icon={Activity} 
        label="Errors" 
        value={3} 
        valueColor="text-status-error"
      />
    );
    const valueSpan = screen.getByText('3');
    expect(valueSpan.className).toContain('text-status-error');
  });
});
