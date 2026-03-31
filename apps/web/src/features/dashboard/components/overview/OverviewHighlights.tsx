import { Ticket, BarChart3, TrendingUp, Sparkles, Activity, Target } from "lucide-react";

interface Props {
  totalSessions: number;
  availableVouchers: number;
  redeemedVouchers: number;
  completionRate?: number;
}

export function OverviewHighlights({ totalSessions, availableVouchers, redeemedVouchers, completionRate = 0 }: Props) {
  const totalVouchers = availableVouchers + redeemedVouchers;
  const consumptionPercentage = totalVouchers > 0 ? Math.round((redeemedVouchers / totalVouchers) * 100) : 0;
  
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (consumptionPercentage / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* SECCIÓN IZQUIERDA: Master Analysis (Gauge + Info) */}
      <div className="lg:col-span-8 app-card !p-10 bg-gradient-to-br from-app-surface to-app-bg/20 flex flex-col md:flex-row items-center gap-12 group">
        <div className="relative h-44 w-44 flex items-center justify-center shrink-0">
            <svg className="h-full w-full -rotate-90">
                <circle cx="88" cy="88" r={radius} className="stroke-app-border fill-none stroke-[10]" />
                <circle 
                    cx="88" cy="88" r={radius} 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="stroke-app-primary fill-none stroke-[10] transition-all duration-1000 ease-out" 
                    style={{ strokeLinecap: 'round' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-app-text-main tracking-tighter leading-none">{consumptionPercentage}%</span>
                <span className="app-label !text-[8px] opacity-40 mt-1">UTILIZADO</span>
            </div>
            <div className="absolute -top-1 -right-1">
                <div className="h-3 w-3 bg-app-primary rounded-full animate-ping opacity-20" />
                <div className="absolute inset-0 h-3 w-3 bg-app-primary rounded-full border-2 border-app-surface" />
            </div>
        </div>

        <div className="flex-1 space-y-8">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Target className="h-5 w-5 text-app-primary" />
                    <h3 className="text-2xl font-black text-app-text-main tracking-tight leading-none">Estado de la Red</h3>
                </div>
                <p className="text-sm font-medium text-app-text-muted/80 leading-relaxed">
                    Balance operativo de los recursos asignados. El índice de consumo actual es óptimo para los objetivos mensuales.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                    <span className="app-label opacity-40">CRÉDITOS EN STOCK</span>
                    <span className="text-3xl font-black text-app-text-main tracking-tighter">{availableVouchers}</span>
                </div>
                <div className="flex flex-col gap-2">
                    <span className="app-label opacity-40">CANJES REALIZADOS</span>
                    <span className="text-3xl font-black text-app-text-main tracking-tighter">{redeemedVouchers}</span>
                </div>
            </div>
        </div>
      </div>

      {/* SECCIÓN DERECHA: Performance Highlight (Más claro y estilado) */}
      <div className="lg:col-span-4 app-card !p-10 border-2 border-app-primary/10 bg-app-surface flex flex-col justify-between group overflow-hidden">
          <div className="space-y-6">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-app-primary/5 rounded-xl border border-app-primary/20">
                      <Activity className="h-6 w-6 text-app-primary" />
                  </div>
                  <div>
                      <span className="app-label opacity-40">VOLUMEN TOTAL</span>
                      <h4 className="text-xs font-black text-app-text-main uppercase tracking-widest mt-0.5">Tests Finalizados</h4>
                  </div>
              </div>
              
              <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-black text-app-text-main tracking-tighter leading-none group-hover:text-app-primary transition-colors">
                    {totalSessions}
                  </span>
                  <div className="flex flex-col">
                      <span className="text-emerald-500 font-black text-xs">↑ 12%</span>
                      <span className="app-label !text-[8px] opacity-40">ESTE MES</span>
                  </div>
              </div>
          </div>

          <div className="pt-8 border-t border-app-border">
              <div className="flex items-center justify-between">
                  <div>
                      <span className="app-label opacity-40">Tasa de Completitud</span>
                      <div className="flex items-center gap-2 mt-1">
                          <div className="h-1.5 w-24 bg-app-bg rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-app-text-main">{completionRate}%</span>
                      </div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/5 text-emerald-600">
                      <TrendingUp className="h-4 w-4" />
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
