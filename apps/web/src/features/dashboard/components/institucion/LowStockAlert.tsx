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
    <div className="rounded-2xl border border-warning-border bg-warning-bg px-6 py-5 shadow-2xl dark:border-warning-border dark:bg-warning-bg">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 rounded-xl border border-warning-border bg-warning-bg p-2 dark:border-warning-border dark:bg-warning-bg">
          <AlertTriangle className="h-5 w-5 text-warning-text dark:text-warning-text" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-warning-text uppercase tracking-wider">
            Alerta de consumo
          </p>
          <p className="mt-1 text-sm font-medium text-warning-text/95 dark:text-app-text-soft">
            Quedan {available} voucher(s) disponibles. Mínimo recomendado: {threshold}.
          </p>
          <div className="mt-3">
            <Button variant="outline" onClick={onNavigate} className="border-warning-border text-warning-text hover:bg-warning-bg dark:border-warning-border dark:text-warning-text">
              Ver vouchers <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <button 
          onClick={onDismiss} 
          aria-label="Cerrar alerta de bajo stock"
          className="rounded-full border border-warning-border p-2 text-warning-text hover:text-warning-text/80 dark:border-warning-border dark:text-warning-text dark:hover:text-warning-text"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};