import { ShieldCheck, Timer } from "lucide-react";

interface SessionReliabilityCardProps {
  reliabilityLevel?: string;
  undosCount?: number;
  avgTimeFormatted: string;
}

export const SessionReliabilityCard = ({ reliabilityLevel, undosCount = 0, avgTimeFormatted }: SessionReliabilityCardProps) => {
  return (
    <div className="app-card shadow-2xl border-l-[8px] !border-l-emerald-500 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-6 mb-12">
          <div className="rounded-2xl bg-app-bg p-4 border border-app-border shadow-xl">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h4 className="app-value !text-2xl mt-0">Consistencia de Respuestas</h4>
            <p className="app-label mt-2">
              Confiabilidad estimada: <b className="text-emerald-500">{reliabilityLevel ?? "No data"}</b>
            </p>
          </div>
        </div>

        <div className="space-y-12 py-4">
          <div className="flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-4">
              <span className="app-label opacity-60">CAMBIOS DE RESPUESTA</span>
              <span className="app-tag !bg-app-bg !text-app-text-main !border-app-border !text-[11px] !px-4 !py-1">
                {undosCount} retrocesos
              </span>
            </div>
            <div className="h-3 w-full bg-app-bg border border-app-border rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                style={{ width: `${Math.max(5, 100 - undosCount * 8)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-4">
              <span className="app-label opacity-60">VELOCIDAD PROMEDIO</span>
              <span className="app-tag !text-[11px] !px-4 !py-1">{avgTimeFormatted}</span>
            </div>
            <div className="w-full flex items-center justify-center gap-3 p-6 rounded-[1.5rem] bg-app-bg border border-app-border border-dashed transition-all hover:bg-emerald-500/5 hover:border-emerald-500/20">
              <Timer className="h-5 w-5 text-emerald-500" />
              <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] text-center">
                Tiempo promedio entre respuestas registradas.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};