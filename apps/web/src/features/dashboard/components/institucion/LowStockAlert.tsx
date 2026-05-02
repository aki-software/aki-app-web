import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "../../../../components/atoms/Button";

interface LowStockAlertProps {
  available: number;
  threshold: number;
  onDismiss: () => void;
  onNavigate: () => void;
}

export const LowStockAlert = ({ available, threshold, onDismiss, onNavigate }: LowStockAlertProps) => {
  return (
    <div className="rounded-2xl border border-amber-900/70 bg-amber-300/80 px-6 py-5 shadow-2xl dark:border-amber-500/40 dark:bg-amber-500/20">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 rounded-xl border border-amber-900/70 bg-amber-200 p-2 dark:border-amber-500/40 dark:bg-amber-500/15">
          <AlertTriangle className="h-5 w-5 text-amber-950 dark:text-amber-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider">
            Alerta de consumo
          </p>
          <p className="mt-1 text-sm font-medium text-amber-950/95 dark:text-app-text-soft">
            Quedan {available} voucher(s) disponibles. Mínimo recomendado: {threshold}.
          </p>
          <div className="mt-3">
            <Button variant="outline" onClick={onNavigate} className="border-amber-900/50 text-amber-950 hover:bg-amber-900/10 dark:border-amber-500/50 dark:text-amber-200">
              Ver vouchers <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        <button 
          onClick={onDismiss} 
          aria-label="Cerrar alerta de bajo stock"
          className="rounded-full border border-amber-900/70 p-2 text-amber-950 hover:text-amber-950/80 dark:border-amber-500/40 dark:text-amber-300 dark:hover:text-amber-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};