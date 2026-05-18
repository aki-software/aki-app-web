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

  it('should apply custom color classes', () => {
    const { container } = render(
      <StatCard 
        icon={Activity} 
        label="Errors" 
        value={5} 
        colorClass="text-rose-500"
      />
    );
    const valueSpan = screen.getByText('5');
    expect(valueSpan.className).toContain('text-rose-500');
  });
});
