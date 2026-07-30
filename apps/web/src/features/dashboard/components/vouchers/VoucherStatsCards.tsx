import { Layers3, Plus, Ticket, TrendingUp } from "lucide-react";
import { VoucherStats } from "../../api/dashboard";
import { StatCard } from "../../../../components/atoms/StatCard";

interface Props {
  isAdmin?: boolean;
  showCreateForm: boolean;
  onToggleForm: () => void;
  onBuyClick?: () => void;
  stats: VoucherStats | null;
  periodDays: number;
}

export function VoucherStatsCards({ isAdmin, showCreateForm, onToggleForm, onBuyClick, stats }: Props) {
  const redemptionRate = stats?.redemptionRate ?? 0;
  const conversionTone = redemptionRate >= 40 ? "text-status-success" : redemptionRate >= 20 ? "text-status-warning" : "text-status-error";

  const cards = [
    { icon: Layers3, label: isAdmin ? "Lotes emitidos" : "Lotes recibidos", value: stats?.totalBatches ?? 0, colorClass: "text-app-text-muted" },
    { icon: Ticket, label: isAdmin ? "Vouchers emitidos" : "Vouchers recibidos", value: stats?.totalVouchers ?? 0, unit: "codigos" },
    { icon: Ticket, label: isAdmin ? "Vouchers canjeados" : "Vouchers consumidos", value: stats?.usedVouchers ?? 0, colorClass: "text-status-success", borderColorClass: "border-status-success/10", bgColorClass: "from-app-surface to-status-success/[0.01]" },
    { icon: Ticket, label: "Vouchers Disponibles", value: stats?.availableVouchers ?? 0, colorClass: "text-sky-400", borderColorClass: "border-sky-400/15", bgColorClass: "from-app-surface to-sky-400/[0.02]" },
    { icon: TrendingUp, label: isAdmin ? "Tasa de Canje" : "Tasa de Consumo", value: `${redemptionRate}%`, colorClass: conversionTone },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
      {cards.map((card, i) => <StatCard key={i} {...card} />)}

      {isAdmin ? (
        <button onClick={onToggleForm} className={`app-card !p-7 flex flex-col items-center justify-center gap-3 border-dashed border-2 transition-all duration-500 group relative overflow-hidden ${showCreateForm ? "bg-status-error/5 border-status-error/40" : "bg-app-primary/5 border-app-primary/40 hover:bg-app-primary hover:border-app-primary active:scale-95"}`}>
          <div className={`p-3 rounded-full transition-all duration-500 shadow-lg ${showCreateForm ? "bg-status-error text-white" : "bg-app-primary text-white group-hover:bg-white group-hover:text-app-primary"}`}>
            <Plus className={`h-6 w-6 transition-transform duration-500 ${showCreateForm ? "rotate-45" : "group-hover:rotate-180"}`} />
          </div>
          <span className={`app-label transition-colors duration-500 font-black tracking-widest ${showCreateForm ? "text-status-error" : "text-app-primary group-hover:text-white"}`}>{showCreateForm ? "Cerrar Panel" : "Emitir Vouchers"}</span>
        </button>
      ) : (
        <button onClick={onBuyClick} className="app-card !p-7 flex flex-col items-center justify-center gap-3 border-dashed border-2 transition-all duration-500 group relative overflow-hidden bg-app-primary/5 border-app-primary/40 hover:bg-app-primary hover:border-app-primary active:scale-95">
          <div className="p-3 rounded-full transition-all duration-500 shadow-lg bg-app-primary text-white group-hover:bg-white group-hover:text-app-primary">
            <Plus className="h-6 w-6 transition-transform duration-500 group-hover:rotate-180" />
          </div>
          <span className="app-label transition-colors duration-500 font-black tracking-widest text-app-primary group-hover:text-white">Comprar Vouchers</span>
        </button>
      )}
    </div>
  );
}
