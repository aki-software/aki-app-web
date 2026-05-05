import { Clock, MousePointer2, Undo2, Zap, ShieldCheck, Timer, Gauge } from 'lucide-react';
import { StatCard } from '../../../../components/molecules/StatCard';
import { formatDuration } from '../../../../utils/date';

// Tipado de métricas (Idealmente esto vendría de @akit/contracts o similar)
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

interface SessionPerformanceMetricsProps {
  metrics: SessionMetrics;
  totalTimeMs: number;
}

// Helpers de Estilos (Mantenelos fuera del componente para que no se redeclaren)
const RELIABILITY_THEMES = {
  'Muy Alta': { border: 'border-l-emerald-500', bar: 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' },
  'Alta': { border: 'border-l-blue-500', bar: 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' },
  'Variable': { border: 'border-l-yellow-500', bar: 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' },
  'Baja': { border: 'border-l-rose-500', bar: 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' },
};

export function SessionPerformanceMetrics({ metrics, totalTimeMs }: SessionPerformanceMetricsProps) {
  
  const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
  
  const theme = RELIABILITY_THEMES[metrics.reliabilityLevel] || { border: 'border-l-app-primary', bar: 'bg-app-primary' };
  
  const revertedPercentage = metrics.totalSwipes > 0 
    ? ((metrics.revertedMatches / metrics.totalSwipes) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8 animate-in">
      {/* Título */}
      <div className="flex items-center gap-4">
        <div className="h-2 w-10 bg-app-primary rounded-full"></div>
        <h3 className="app-value !text-2xl mt-0">Métricas de Desempeño</h3>
      </div>

      {/* Grid de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Duración Total"
          value={formatDuration(totalTimeMs)}
          icon={<Clock className="h-5 w-5 text-app-primary" />}
        />
        <StatCard
          label="Total de Swipes"
          value={metrics.totalSwipes}
          icon={<MousePointer2 className="h-5 w-5 text-app-primary" />}
        />
        <StatCard
          label="Matches Revertidos"
          value={metrics.revertedMatches}
          icon={<Undo2 className="h-5 w-5 text-app-primary" />}
        />
        <StatCard
          label="Velocidad Promedio"
          value={formatSeconds(metrics.avgTimeBetweenSwipesMs)}
          icon={<Zap className="h-5 w-5 text-app-primary" />}
        />
      </div>

      {/* Análisis de Velocidad */}
      <div className="app-card shadow-xl !p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-app-bg rounded-xl border border-app-border">
            <Gauge className="h-5 w-5 text-app-primary" />
          </div>
          <div>
            <p className="app-label opacity-60">ANÁLISIS DE VELOCIDAD</p>
            <h4 className="text-sm font-black text-app-text-main uppercase tracking-wide mt-1">
              Rango de Velocidad de Respuesta
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 p-6 rounded-2xl bg-app-surface/70 border border-app-border/50">
          {[
            { label: 'MÍNIMO', val: formatSeconds(metrics.minTimeBetweenSwipesMs), desc: 'Respuesta más rápida' },
            { label: 'PROMEDIO', val: formatSeconds(metrics.avgTimeBetweenSwipesMs), desc: 'Tiempo medio', border: true },
            { label: 'MÁXIMO', val: formatSeconds(metrics.maxTimeBetweenSwipesMs), desc: 'Respuesta más lenta' },
          ].map((item, i) => (
            <div key={i} className={`flex flex-col items-center text-center ${item.border ? 'border-l border-r border-app-border/30' : ''}`}>
              <p className="app-label opacity-60 mb-3">{item.label}</p>
              <p className="app-value !text-xl">{item.val}</p>
              <p className="app-desc text-[10px] mt-2 opacity-50">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Nivel de Confiabilidad */}
      <div className={`app-card shadow-2xl border-l-[8px] !p-8 ${theme.border}`}>
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-app-bg rounded-xl border border-app-border">
            <ShieldCheck className="h-5 w-5 text-app-primary" />
          </div>
          <div>
            <p className="app-label opacity-60">INDICADOR DE CALIDAD</p>
            <h4 className="text-sm font-black text-app-text-main uppercase tracking-wide mt-1">
              Nivel de Confiabilidad
            </h4>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6 p-6 rounded-2xl bg-app-surface/70 border border-app-border/50">
            <div className="flex flex-col items-center text-center">
              <p className="app-label opacity-60 mb-3">PUNTUACIÓN</p>
              <p className="app-value !text-3xl">{metrics.reliabilityScore}%</p>
            </div>
            <div className="flex flex-col items-center text-center border-l border-app-border/30">
              <p className="app-label opacity-60 mb-3">CLASIFICACIÓN</p>
              <p className="app-value !text-lg text-app-text-main uppercase tracking-wide">{metrics.reliabilityLevel}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="app-label opacity-60">PROGRESO DE CONFIABILIDAD</span>
              <span className="app-tag !text-[10px]">{metrics.reliabilityScore}%</span>
            </div>
            <div className="w-full h-3 bg-app-bg border border-app-border rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${theme.bar}`}
                style={{ width: `${metrics.reliabilityScore}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 rounded-xl bg-app-bg/50 border border-app-border/30">
            <Timer className="h-5 w-5 text-app-text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="app-label opacity-60 text-[10px]">CAMBIOS DE RESPUESTA</p>
              <p className="text-sm font-semibold text-app-text-main mt-1">
                {metrics.revertedMatches} retrocesos ({revertedPercentage}% del total)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};