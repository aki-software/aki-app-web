import React, { useState, useMemo } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { API_URL } from '../../../../config/app-config';
import { getStoredToken } from '../../../../utils/storage';
import type { SessionData } from "../../api/sessions.api";

interface SessionMetrics {
  id: number;
  totalDurationMs: number;
  totalSwipes: number;
  uniqueCards: number;
  revertedMatches: number;
  avgTimeBetweenSwipesMs: number;
  minTimeBetweenSwipesMs: number;
  maxTimeBetweenSwipesMs: number;
  reliabilityScore: number;
  reliabilityLevel: 'Muy Alta' | 'Alta' | 'Variable' | 'Baja';
  calculatedAt: string;
}

interface SessionData {
  id: string;
  patientName: string;
  hollandCode: string;
  sessionDate: string |number | Date;
  totalTimeMs: number;
  paymentStatus: string;
  metrics?: SessionMetrics;
  
}

interface VoucherSessionsTableProps {
  voucherId: string;
  sessions: SessionData[];
  loading: boolean;
}

interface VoucherSessionsTableProps {
  voucherId: string;
  sessions: SessionData[];
  loading: boolean;
}

export function VoucherSessionsTable({
  voucherId,
  sessions,
  loading,
}: VoucherSessionsTableProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minDuration, setMinDuration] = useState<number | ''>('');
  const [maxDuration, setMaxDuration] = useState<number | ''>('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Filtrar sesiones
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.sessionDate);
      const durationMinutes = session.totalTimeMs / 60000;

      if (startDate && sessionDate < new Date(startDate)) return false;
      if (endDate && sessionDate > new Date(endDate)) return false;
      if (minDuration && durationMinutes < minDuration) return false;
      if (maxDuration && durationMinutes > maxDuration) return false;

      return true;
    });
  }, [sessions, startDate, endDate, minDuration, maxDuration]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const handleDownloadPdf = async (sessionId: string) => {
    try {
      const token = getStoredToken();
      const response = await fetch(`${API_URL}/sessions/${sessionId}/report/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Failed to download PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionId}.html`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando sesiones...</div>;
  }

  return (
      <div className="space-y-4">
      <h3 className="text-lg font-semibold text-app-text-main">Sesiones de este Voucher</h3>

      {/* Filtros */}
      <div className="bg-app-surface/90 p-4 rounded-lg border border-app-border">
        <h4 className="font-semibold text-sm mb-3 text-app-text-main">Filtros</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-app-text-soft mb-1">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-app-border rounded text-sm bg-app-bg text-app-text-main"
            />
          </div>
          <div>
            <label className="block text-sm text-app-text-soft mb-1">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-app-border rounded text-sm bg-app-bg text-app-text-main"
            />
          </div>
          <div>
            <label className="block text-sm text-app-text-soft mb-1">Duración Mín (min)</label>
            <input
              type="number"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2 border border-app-border rounded text-sm bg-app-bg text-app-text-main"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm text-app-text-soft mb-1">Duración Máx (min)</label>
            <input
              type="number"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2 border border-app-border rounded text-sm bg-app-bg text-app-text-main"
              placeholder="999"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto border border-app-border rounded-lg shadow-sm">
        <table className="w-full">
          <thead className="bg-app-surface/95 border-b border-app-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-soft">Paciente</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-soft">Fecha</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-soft">Duración</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-soft">Confiabilidad</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-app-text-soft">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.map((session) => (
              <React.Fragment key={session.id}>
                  <tr className="border-b border-app-border hover:bg-app-surface/70">
                  <td className="px-4 py-3 text-sm text-app-text-main">{session.patientName}</td>
                  <td className="px-4 py-3 text-sm text-app-text-soft">
                    {new Date(session.sessionDate).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3 text-sm text-app-text-soft">{formatDuration(session.totalTimeMs)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        session.metrics?.reliabilityLevel === 'Muy Alta'
                          ? 'bg-emerald-200/80 text-emerald-900'
                          : session.metrics?.reliabilityLevel === 'Alta'
                            ? 'bg-emerald-100/70 text-emerald-800'
                            : session.metrics?.reliabilityLevel === 'Variable'
                              ? 'bg-amber-200/80 text-amber-900'
                              : 'bg-rose-200/80 text-rose-900'
                      }`}
                    >
                      {session.metrics?.reliabilityLevel || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <button
                      onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                      className="text-app-primary hover:text-app-primary-hover font-medium inline-flex items-center"
                      title="Expandir detalles"
                    >
                      <ChevronDown size={18} />
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(session.id)}
                      className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center"
                      title="Descargar reporte"
                    >
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
                {expandedSession === session.id && (
                  <tr className="bg-app-surface/70 border-b border-app-border">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>Holland Code:</strong> {session.hollandCode}
                        </p>
                        <p>
                          <strong>Swipes Totales:</strong> {session.metrics?.totalSwipes}
                        </p>
                        <p>
                          <strong>Matches Revertidos:</strong> {session.metrics?.revertedMatches}
                        </p>
                        <p>
                          <strong>Velocidad Promedio:</strong>{' '}
                          {(session.metrics?.avgTimeBetweenSwipesMs / 1000).toFixed(2)}s
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-8 text-app-text-muted">No hay sesiones que coincidan con los filtros</div>
      )}

      <p className="text-sm text-app-text-soft">
        Mostrando {filteredSessions.length} de {sessions.length} sesiones
      </p>
    </div>
  );
}
