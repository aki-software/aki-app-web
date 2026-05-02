import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ReactNode } from "react";

interface AlertProps {
  type: "error" | "success" | "warning";
  message: string;
  className?: string;
  icon?: ReactNode;
}

export const Alert = ({ type, message, className = "" }: AlertProps) => {
  if (!message) return null;

  const isError = type === "error";
  const isWarning = type === "warning";
  const Icon = isError ? AlertCircle : isWarning ? AlertCircle : CheckCircle2;
  
  const colorClasses = isError
    ? "border-red-400/30 bg-red-500/10 text-red-300"
    : isWarning
    ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-300"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    
  const iconColor = isError ? "text-red-400" : "text-emerald-400";

  return (
    <div className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 ${colorClasses} ${className}`}>
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconColor}`} />
      <p className="text-sm">{message}</p>
    </div>
  );
};