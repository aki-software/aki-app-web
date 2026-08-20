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
    <div role="alert" className="rounded-2xl border border-status-warning/30 bg-status-warning/10 px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 rounded-xl border border-status-warning/30 bg-status-warning/10 p-2">
          <AlertTriangle className="h-5 w-5 text-status-warning" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase tracking-wider text-status-warning">
            Alerta de consumo
          </p>
          <p className="mt-1 text-sm font-medium text-app-text-main">
            Quedan {available} voucher(s) disponibles. Mínimo recomendado: {threshold}.
          </p>
          <div className="mt-3">
            <Button variant="outline" onClick={onNavigate} className="border-status-warning/30 text-status-warning hover:bg-status-warning/10">
              Ver vouchers <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Cerrar alerta de bajo stock"
          className="rounded-full border border-status-warning/30 p-2 text-status-warning hover:bg-status-warning/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-warning"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
