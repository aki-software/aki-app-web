import { Info } from "lucide-react";
import type { BehavioralTrends } from "@akit/contracts";
import { SelectivityDonut } from "./SelectivityDonut";
import { FatigueGauge } from "./FatigueGauge";
import { RushGauge } from "./RushGauge";

interface BehavioralTrendsSectionProps {
  trends: BehavioralTrends | null;
}

export function BehavioralTrendsSection({
  trends,
}: BehavioralTrendsSectionProps) {
  if (!trends) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-app-border" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-app-text-muted/50">
            Comportamiento en sesiones
          </span>
          <div className="h-px flex-1 bg-app-border" />
        </div>
        <p className="text-xs font-medium text-app-text-muted/60 text-center py-8">
          No hay datos comportamentales disponibles para el período seleccionado.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Section header with tooltip */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-app-border" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-app-text-muted/50">
          Comportamiento en sesiones
        </span>
        <div className="group relative flex items-center">
          <Info className="h-4 w-4 text-app-text-muted/40 hover:text-app-primary cursor-help transition-colors" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-72 p-4 rounded-2xl bg-app-text-main text-app-bg text-xs font-semibold leading-relaxed shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-20">
            <p className="mb-2">
              <strong>Selectividad:</strong> Cómo acepta o rechaza opciones.
              Explorador (acepta mucho) ↔ Selectivo (rechaza mucho).
            </p>
            <p className="mb-2">
              <strong>Fatiga:</strong> % de sesiones donde el paciente se
              lentificó al final del test.
            </p>
            <p className="mb-0">
              <strong>Rush:</strong> % de sesiones donde el paciente respondió
              muy rápido en ciertos tramos, posible descuido.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-8 border-transparent border-t-app-text-main" />
          </div>
        </div>
        <div className="h-px flex-1 bg-app-border" />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SelectivityDonut
          selective={trends.selectivityDistribution.selective}
          balanced={trends.selectivityDistribution.balanced}
          exploratory={trends.selectivityDistribution.exploratory}
          totalSessions={trends.eligibleSessions}
        />
        <FatigueGauge
          fatigueRate={trends.fatigueRate}
          totalSessions={trends.totalSessions}
        />
        <RushGauge
          rushRate={trends.rushRate}
          totalSessions={trends.totalSessions}
        />
      </div>
    </div>
  );
}
