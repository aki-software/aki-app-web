import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { ReactNode } from "react";

interface AlertProps {
  type: "error" | "success" | "warning";
  message: string;
  className?: string;
  icon?: ReactNode;
  onClose?: () => void;
}

export const Alert = ({ type, message, className = "", onClose }: AlertProps) => {
  if (!message) return null;

  const isError = type === "error";
  const isWarning = type === "warning";
  const Icon = isError ? AlertCircle : isWarning ? AlertCircle : CheckCircle2;
  
  const colorClasses = isError
    ? "border-status-error/30 bg-status-error/10 text-status-error"
    : isWarning
    ? "border-status-warning/30 bg-status-warning/10 text-status-warning"
    : "border-status-success/30 bg-status-success/10 text-status-success";
    
  const iconColor = isError ? "text-status-error" : "text-status-success";

  return (
    <div role="alert" className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 relative group/alert ${colorClasses} ${className}`}>
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconColor}`} aria-hidden="true" />
      <p className="text-sm flex-1 pr-6">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-0.5 rounded-md opacity-50 hover:opacity-100 hover:bg-black/10 transition-all"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};