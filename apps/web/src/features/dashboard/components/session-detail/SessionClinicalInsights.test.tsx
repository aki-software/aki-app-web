import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SessionClinicalInsights } from './SessionClinicalInsights';
import { SessionMetrics } from '@akit/contracts';

window.matchMedia = window.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

describe('SessionClinicalInsights', () => {
  const mockMetrics = {
    selectivityLevel: 'EXPLORATORY',
    likeRatio: 0.8,
    totalSwipes: 10,
    fatigueDetected: false,
    firstHalfLikeRate: 0.8,
    lastHalfLikeRate: 0.8,
    revertedMatches: 0,
    rushDetected: false,
    reliabilityLevel: 'Alta',
    matchPercentage: 0,
    totalDurationSeconds: 0,
    avgResponseTime: 0,
    topCategories: []
  } as unknown as SessionMetrics;

  it('renders "Ver detalle" and opens BottomSheet with clinical criteria', () => {
    render(<SessionClinicalInsights metrics={mockMetrics} />);
    
    // El texto 'Ver detalle' debe estar presente y ser clickeable (un botón en el refactor)
    const btn = screen.getByText('Ver detalle');
    expect(btn).toBeInTheDocument();
    
    // Inicialmente el BottomSheet (Criterio clínico) no debería estar montado o estar invisible (fuera del DOM porque isOpen es false por defecto)
    // El BottomSheet tiene el título "Criterio clínico" que queremos pasar
    expect(screen.queryByText('Criterio clínico')).not.toBeInTheDocument();

    // Hacemos click
    fireEvent.click(btn);

    // Ahora debería abrirse el BottomSheet y mostrar el contenido
    expect(screen.getByText('Criterio clínico')).toBeInTheDocument();
  });
});
