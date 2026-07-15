import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Flag } from "lucide-react";

interface HealthBarProps {
  completionRate?: number;
  alertsCount?: number;
  triageCount?: number;
  totalSessions?: number;
}

function formatCount(value: number): string {
  if (value > 999) {
    return (value / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return String(value);
}

function completionColor(value: number): "green" | "yellow" | "red" {
  if (value >= 80) return "green";
  if (value >= 50) return "yellow";
  return "red";
}

function alertsColor(value: number): "green" | "yellow" | "red" {
  if (value === 0) return "green";
  if (value <= 3) return "yellow";
  return "red";
}

function triageColor(value: number): "green" | "yellow" | "red" {
  if (value === 0) return "green";
  if (value <= 5) return "yellow";
  return "red";
}

const STATUS_STYLES: Record<
  "green" | "yellow" | "red",
  { border: string; badge: string; text: string }
> = {
  green: {
    border: "border-l-status-success",
    badge: "bg-status-success/10 text-status-success border-status-success/20",
    text: "text-status-success",
  },
  yellow: {
    border: "border-l-status-warning",
    badge: "bg-status-warning/10 text-status-warning border-status-warning/20",
    text: "text-status-warning",
  },
  red: {
    border: "border-l-status-error",
    badge: "bg-status-error/10 text-status-error border-status-error/20",
    text: "text-status-error",
  },
};

function IndicatorCard({
  icon,
  label,
  value,
  color,
  linkTo,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "green" | "yellow" | "red";
  linkTo?: string;
}) {
  const navigate = useNavigate();
  const styles = STATUS_STYLES[color];
  const baseClass = `app-card !p-5 border-l-4 ${styles.border} text-left w-full`;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-xl p-2.5 border ${styles.badge}`}>
          {icon}
        </div>
        <span className={`text-sm font-black tabular-nums ${styles.text}`}>
          {formatCount(value)}
        </span>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-muted/80">
        {label}
      </p>
    </>
  );

  if (linkTo) {
    return (
      <button
        type="button"
        onClick={() => navigate(linkTo)}
        className={`${baseClass} cursor-pointer hover:shadow-lg transition-all group`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

export function HealthBar({
  completionRate = 0,
  alertsCount = 0,
  triageCount = 0,
}: HealthBarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <IndicatorCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label="Tasa de finalización"
        value={completionRate}
        color={completionColor(completionRate)}
        linkTo="/dashboard/results"
      />
      <IndicatorCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Instituciones con alertas"
        value={alertsCount}
        color={alertsColor(alertsCount)}
        linkTo="/dashboard/users"
      />
      <IndicatorCard
        icon={<Flag className="h-5 w-5" />}
        label="Sesiones pendientes de revisión"
        value={triageCount}
        color={triageColor(triageCount)}
      />
    </div>
  );
}
