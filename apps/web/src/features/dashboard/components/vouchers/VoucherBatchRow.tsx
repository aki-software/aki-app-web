import { Layers3, Calendar, CheckCircle2, History, ArrowUpRight } from "lucide-react";
import type { BatchSummary } from "../../views/DashboardVouchers";

function formatDate(value: string | number | Date) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

interface Props {
  batch: BatchSummary;
}

export function VoucherBatchRow({ batch }: Props) {
  const consumptionPercentage = Math.round((batch.used / batch.total) * 100);
  
  return (
    <div className="app-card !p-10 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 group relative overflow-hidden flex flex-col justify-between h-full border-app-border hover:border-app-primary/30">
        <div className="absolute -right-6 -top-6 p-10 bg-app-bg rounded-full opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all">
            <Layers3 className="h-24 w-24 text-app-primary" />
        </div>

        <div>
            <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-app-primary/10 rounded-2xl border border-app-primary/20 shadow-inner">
                        <Layers3 className="h-6 w-6 text-app-primary" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter text-app-text-main group-hover:text-app-primary transition-colors leading-none whitespace-nowrap">
                            Lote {batch.batchId.slice(0, 8).toUpperCase()}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                            <Calendar className="h-3.5 w-3.5 text-app-text-muted opacity-60" />
                            <span className="app-label opacity-60">
                                COMPRA: {formatDate(batch.createdAt).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 mb-12">
                <div className="flex justify-between items-end px-1">
                    <span className="app-label opacity-40">NIVEL DE CONSUMO</span>
                    <span className="app-value !text-xl font-black">{consumptionPercentage}%</span>
                </div>
                <div className="h-4 w-full bg-app-bg border border-app-border rounded-full overflow-hidden p-1 shadow-inner">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(79,70,229,0.4)] ${
                            consumptionPercentage === 100 ? 'bg-rose-500 shadow-rose-500/30' : 'bg-app-primary'
                        }`}
                        style={{ width: `${consumptionPercentage}%` }}
                    />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-app-border bg-gradient-to-b from-transparent to-app-bg/10 -mx-10 px-10">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="app-label opacity-50">DISPONIBLES</span>
                </div>
                <span className="app-value !text-4xl text-emerald-500 tracking-tighter leading-none">{batch.available}</span>
            </div>
            <div className="flex flex-col gap-2 text-right">
                <div className="flex items-center gap-2 justify-end">
                    <span className="app-label opacity-50">CONSUMIDOS</span>
                    <div className="h-2 w-2 rounded-full bg-app-primary shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                </div>
                <span className="app-value !text-4xl tracking-tighter opacity-80 leading-none">{batch.used}</span>
            </div>
        </div>
        
        <div className="mt-10 flex justify-center">
            <div className="app-tag inline-flex items-center gap-3 !px-6 !py-3 !bg-app-surface border-app-border text-app-text-muted transition-all group-hover:border-app-primary/30 group-hover:shadow-lg cursor-default whitespace-nowrap">
                <span className="font-bold text-xs tracking-widest">TOTAL: {batch.total} CRÉDITOS</span>
                <ArrowUpRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:text-app-primary transition-all" />
            </div>
        </div>
    </div>
  );
}
