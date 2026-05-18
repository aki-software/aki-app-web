import { BadgeCheck, Clock, XCircle, AlertCircle, Info } from "lucide-react";
import { ReactNode } from "react";

interface StatusBadgeProps {
  status: string;
  type?: 'voucher' | 'session' | 'institution';
  showIcon?: boolean;
  className?: string;
}

interface BadgeConfig {
  label: string;
  classes: string;
  icon: ReactNode;
}

export const StatusBadge = ({ 
  status, 
  type = 'voucher', 
  showIcon = true,
  className = "" 
}: StatusBadgeProps) => {
  
  const getVoucherConfig = (s: string): BadgeConfig => {
    switch (s) {
      case "AVAILABLE": return {
        label: "Disponible",
        classes: "text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-200/60 dark:bg-emerald-500/10 shadow-emerald-500/10",
        icon: <Info className="h-3.5 w-3.5" />
      };
      case "SENT": return {
        label: "Enviado",
        classes: "text-amber-700 dark:text-amber-300 border-amber-500/40 bg-amber-200/60 dark:bg-amber-500/10 shadow-amber-500/10",
        icon: <Clock className="h-3.5 w-3.5" />
      };
      case "USED": return {
        label: "Canjeado",
        classes: "text-rose-800 dark:text-rose-200 border-rose-600/50 bg-rose-300/70 dark:bg-rose-500/15 shadow-rose-500/10",
        icon: <BadgeCheck className="h-3.5 w-3.5" />
      };
      case "EXPIRED": return {
        label: "Expirado",
        classes: "text-rose-600 dark:text-rose-300 border-rose-500/40 bg-rose-200/60 dark:bg-rose-500/10 shadow-rose-500/10",
        icon: <AlertCircle className="h-3.5 w-3.5" />
      };
      case "REVOKED": return {
        label: "Revocado",
        classes: "text-zinc-600 dark:text-zinc-300 border-zinc-500/30 bg-zinc-200/60 dark:bg-zinc-500/10 shadow-zinc-500/10",
        icon: <XCircle className="h-3.5 w-3.5" />
      };
      default: return {
        label: s,
        classes: "text-app-text-muted border-app-border bg-app-bg",
        icon: null
      };
    }
  };

  const getSessionConfig = (s: string): BadgeConfig => {
    switch (s) {
      case "PAID": return {
        label: "Directo",
        classes: "text-blue-700 dark:text-blue-300 border-blue-500/40 bg-blue-200/60 dark:bg-blue-500/10",
        icon: <BadgeCheck className="h-3.5 w-3.5" />
      };
      case "VOUCHER_REDEEMED": return {
        label: "Voucher",
        classes: "text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-200/60 dark:bg-emerald-500/10",
        icon: <Info className="h-3.5 w-3.5" />
      };
      default: return {
        label: s,
        classes: "text-app-text-muted border-app-border bg-app-bg",
        icon: null
      };
    }
  };

  const config = type === 'voucher' ? getVoucherConfig(status) : getSessionConfig(status);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm transition-all hover:scale-105 whitespace-nowrap ${config.classes} ${className}`}>
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};
