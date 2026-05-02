import { Clock, MousePointer2, Undo2, Zap, ShieldCheck, Timer, Gauge } from 'lucide-react';
import { StatCard } from '../StatCard';

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

export function SessionPerformanceMetrics({
  metrics,
  totalTimeMs,
}: SessionPerformanceMetricsProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

  const getReliabilityProgressColor = (level: string) => {
    switch (level) {
      case 'Muy Alta':
        return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] dark:shadow-[0_0_15px_rgba(16,185,129,0.4)]';
      case 'Alta':
        return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:shadow-[0_0_15px_rgba(59,130,246,0.4)]';
      case 'Variable':
        return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] dark:shadow-[0_0_15px_rgba(234,179,8,0.42)]';
      case 'Baja':
        return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] dark:shadow-[0_0_15px_rgba(244,63,94,0.42)]';
      default:
        return 'bg-app-primary shadow-[0_0_15px_rgba(47,122,102,0.28)] dark:shadow-[0_0_15px_rgba(70,167,137,0.32)]';
    }
  };

  const getReliabilityBorderColor = (level: string) => {
    switch (level) {
      case 'Muy Alta':
        return 'border-l-emerald-500';
      case 'Alta':
        return 'border-l-blue-500';
      case 'Variable':
        return 'border-l-yellow-500';
      case 'Baja':
        return 'border-l-rose-500';
      default:
        return 'border-l-app-primary';
    }
  };

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

      {/* Grid de métricas principales con StatCard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Duración Total"
          value={formatDuration(totalTimeMs)}
          icon={Clock}
        />
        <StatCard
          title="Total de Swipes"
          value={metrics.totalSwipes}
          icon={MousePointer2}
        />
        <StatCard
          title="Matches Revertidos"
          value={metrics.revertedMatches}
          icon={Undo2}
        />
        <StatCard
          title="Velocidad Promedio"
          value={formatSeconds(metrics.avgTimeBetweenSwipesMs)}
          icon={Zap}
        />
      </div>

      {/* Rango de velocidad */}
      <div className="app-card shadow-xl">
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
          <div className="flex flex-col items-center text-center">
            <p className="app-label opacity-60 mb-3">MÍNIMO</p>
            <p className="app-value !text-xl">{formatSeconds(metrics.minTimeBetweenSwipesMs)}</p>
            <p className="app-desc text-[10px] mt-2 opacity-50">Respuesta más rápida</p>
          </div>
          <div className="flex flex-col items-center text-center border-l border-r border-app-border/30">
            <p className="app-label opacity-60 mb-3">PROMEDIO</p>
            <p className="app-value !text-xl">{formatSeconds(metrics.avgTimeBetweenSwipesMs)}</p>
            <p className="app-desc text-[10px] mt-2 opacity-50">Tiempo medio</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <p className="app-label opacity-60 mb-3">MÁXIMO</p>
            <p className="app-value !text-xl">{formatSeconds(metrics.maxTimeBetweenSwipesMs)}</p>
            <p className="app-desc text-[10px] mt-2 opacity-50">Respuesta más lenta</p>
          </div>
        </div>
      </div>

      {/* Nivel de Confiabilidad */}
      <div className={`app-card shadow-2xl border-l-[8px] ${getReliabilityBorderColor(metrics.reliabilityLevel)}`}>
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

        <div className="space-y-6">
          {/* Score y Nivel */}
          <div className="grid grid-cols-2 gap-6 p-6 rounded-2xl bg-app-surface/70 border border-app-border/50">
            <div className="flex flex-col items-center text-center">
              <p className="app-label opacity-60 mb-3">PUNTUACIÓN</p>
              <p className="app-value !text-3xl">{metrics.reliabilityScore}%</p>
            </div>
            <div className="flex flex-col items-center text-center border-l border-app-border/30">
              <p className="app-label opacity-60 mb-3">CLASIFICACIÓN</p>
              <p className="app-value !text-lg text-app-text-main uppercase tracking-wide">
                {metrics.reliabilityLevel}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="app-label opacity-60">PROGRESO DE CONFIABILIDAD</span>
              <span className="app-tag !text-[10px]">{metrics.reliabilityScore}%</span>
            </div>
            <div className="w-full h-3 bg-app-bg border border-app-border rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${getReliabilityProgressColor(metrics.reliabilityLevel)}`}
                style={{ width: `${metrics.reliabilityScore}%` }}
              />
            </div>
          </div>

          {/* Detalle de cambios */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-app-bg/50 border border-app-border/30">
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
}
