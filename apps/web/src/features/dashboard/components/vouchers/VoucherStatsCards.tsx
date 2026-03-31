import { Ticket, BadgeCheck, History, Plus, Layers3 } from "lucide-react";

interface Props {
  isAdmin?: boolean;
  showCreateForm: boolean;
  onToggleForm: () => void;
  vouchersCount: number;
  batchesCount: number;
  availableCount: number;
  usedCount: number;
}

export function VoucherStatsCards({
  isAdmin,
  showCreateForm,
  onToggleForm,
  vouchersCount,
  batchesCount,
  availableCount,
  usedCount,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Tarjeta de Créditos Disponibles (COMPACTA LUX 4.1) */}
      <div className="app-card !p-7 shadow-lg border-emerald-500/10 bg-gradient-to-br from-app-surface to-emerald-500/[0.01] group relative overflow-hidden">
        <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
           <BadgeCheck className="h-20 w-20 text-emerald-500" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-sm">
                <BadgeCheck className="h-5 w-5 text-emerald-500" />
             </div>
             <span className="app-label opacity-60 tracking-wider">
                {isAdmin ? "Licencias Disponibles" : "Créditos Disponibles"}
             </span>
          </div>
          <div className="flex items-baseline gap-2">
             <span className="app-value !text-3xl font-black text-emerald-500 tracking-tighter leading-none">
                {availableCount}
             </span>
             <span className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">uds</span>
          </div>
        </div>
      </div>

      {/* Tarjeta de Consumidos */}
      <div className="app-card !p-7 shadow-lg border-app-primary/10 bg-gradient-to-br from-app-surface to-app-primary/[0.01] group relative overflow-hidden">
        <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
           <History className="h-20 w-20 text-app-primary" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-app-primary/10 rounded-xl border border-app-primary/20 shadow-sm">
                <History className="h-5 w-5 text-app-primary" />
             </div>
             <span className="app-label opacity-60 tracking-wider">Consumidos</span>
          </div>
          <div className="flex items-baseline gap-2">
             <span className="app-value !text-3xl font-black text-app-text-main tracking-tighter leading-none">
                {usedCount}
             </span>
          </div>
        </div>
      </div>

      {/* Tarjeta de Mis Lotes */}
      <div className="app-card !p-7 shadow-lg border-app-border bg-gradient-to-br from-app-surface to-app-bg/30 group relative overflow-hidden">
        <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
           <Layers3 className="h-20 w-20 text-app-text-muted" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-app-bg rounded-xl border border-app-border shadow-sm">
                <Layers3 className="h-5 w-5 text-app-text-muted" />
             </div>
             <span className="app-label opacity-60 tracking-wider">
                {isAdmin ? "Lotes Totales" : "Mis Lotes"}
             </span>
          </div>
          <div className="flex items-baseline gap-2">
             <span className="app-value !text-3xl font-black text-app-text-main tracking-tighter leading-none">
                {batchesCount}
             </span>
          </div>
        </div>
      </div>

      {/* Botón de Acción Compacto */}
      {isAdmin ? (
        <button
          onClick={onToggleForm}
          className={`app-card !p-7 flex flex-col items-center justify-center gap-3 border-dashed border-2 transition-all duration-500 group relative overflow-hidden ${
            showCreateForm
              ? "bg-rose-500/5 border-rose-500/40"
              : "bg-app-primary/5 border-app-primary/40 hover:bg-app-primary hover:border-app-primary active:scale-95"
          }`}
        >
          <div className={`p-3 rounded-full transition-all duration-500 shadow-lg ${
            showCreateForm ? 'bg-rose-500 text-white' : 'bg-app-primary text-white group-hover:bg-white group-hover:text-app-primary'
          }`}>
            <Plus className={`h-6 w-6 transition-transform duration-500 ${showCreateForm ? 'rotate-45' : 'group-hover:rotate-180'}`} />
          </div>
          <span className={`app-label transition-colors duration-500 font-black tracking-widest ${
            showCreateForm ? 'text-rose-600' : 'text-app-primary group-hover:text-white'
          }`}>
            {showCreateForm ? "Cerrar Panel" : "Emitir Vouchers"}
          </span>
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
             <p className="text-[10.5px] font-medium text-app-text-muted leading-snug opacity-70">
               Cada crédito te permite realizar un test vocacional completo con informe incluido.
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
