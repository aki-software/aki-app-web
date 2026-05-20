import { Layers3, Plus, Ticket, TrendingUp } from "lucide-react";
import { VoucherStats } from "../../api/dashboard";
import { StatCard } from "../../../../components/atoms/StatCard";

interface Props {
  isAdmin?: boolean;
  showCreateForm: boolean;
  onToggleForm: () => void;
  stats: VoucherStats | null;
  periodDays: number;
}

export function VoucherStatsCards({ isAdmin, showCreateForm, onToggleForm, stats }: Props) {
  const redemptionRate = stats?.redemptionRate ?? 0;
  const conversionTone = redemptionRate >= 40 ? "text-emerald-500" : redemptionRate >= 20 ? "text-amber-400" : "text-rose-400";

  const cards = [
    { icon: Layers3, label: isAdmin ? "Lotes emitidos" : "Lotes recibidos", value: stats?.totalBatches ?? 0, colorClass: "text-app-text-muted" },
    { icon: Ticket, label: isAdmin ? "Vouchers emitidos" : "Vouchers recibidos", value: stats?.totalVouchers ?? 0, unit: "codigos" },
    { icon: Ticket, label: isAdmin ? "Vouchers canjeados" : "Vouchers consumidos", value: stats?.usedVouchers ?? 0, colorClass: "text-emerald-500", borderColorClass: "border-emerald-500/10", bgColorClass: "from-app-surface to-emerald-500/[0.01]" },
    { icon: Ticket, label: "Vouchers Disponibles", value: stats?.availableVouchers ?? 0, colorClass: "text-sky-400", borderColorClass: "border-sky-400/15", bgColorClass: "from-app-surface to-sky-400/[0.02]" },
    { icon: TrendingUp, label: isAdmin ? "Tasa de Canje" : "Tasa de Consumo", value: `${redemptionRate}%`, colorClass: conversionTone },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
      {cards.map((card, i) => <StatCard key={i} {...card} />)}

      {isAdmin ? (
        <button onClick={onToggleForm} className={`app-card !p-7 flex flex-col items-center justify-center gap-3 border-dashed border-2 transition-all duration-500 group relative overflow-hidden ${showCreateForm ? "bg-rose-500/5 border-rose-500/40" : "bg-app-primary/5 border-app-primary/40 hover:bg-app-primary hover:border-app-primary active:scale-95"}`}>
          <div className={`p-3 rounded-full transition-all duration-500 shadow-lg ${showCreateForm ? "bg-rose-500 text-white" : "bg-app-primary text-white group-hover:bg-white group-hover:text-app-primary"}`}>
            <Plus className={`h-6 w-6 transition-transform duration-500 ${showCreateForm ? "rotate-45" : "group-hover:rotate-180"}`} />
          </div>
          <span className={`app-label transition-colors duration-500 font-black tracking-widest ${showCreateForm ? "text-rose-600" : "text-app-primary group-hover:text-white"}`}>{showCreateForm ? "Cerrar Panel" : "Emitir Vouchers"}</span>
        </button>
      ) : (
        <div className="app-card !p-7 shadow-lg border-app-border bg-app-bg/5 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
            <Ticket className="h-20 w-20 text-app-text-muted" />
          </div>
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <Ticket className="h-4 w-4 text-app-primary opacity-40" />
              <span className="app-label opacity-60 tracking-wider">Info Adicional</span>
            </div>
            <p className="text-[10.5px] font-medium text-app-text-muted leading-snug opacity-70">Cada crédito te permite realizar un test vocacional completo con informe incluido.</p>
          </div>
        </div>
      )}
    </div>
  );
}
