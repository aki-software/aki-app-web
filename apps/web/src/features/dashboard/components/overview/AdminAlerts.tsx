import { AdminAlert } from "@akit/contracts";
import { AlertOctagon, AlertTriangle, ArrowRight, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminAlertsProps {
  alerts: AdminAlert[];
}

function getSeverityIcon(severity: AdminAlert["severity"]) {
  switch (severity) {
    case "critical":
      return <AlertOctagon className="h-4 w-4 text-red-400" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    default:
      return <Info className="h-4 w-4 text-app-primary" />;
  }
}

function getSeverityStyles(severity: AdminAlert["severity"]) {
  switch (severity) {
    case "critical":
      return "border-red-400/30 bg-red-500/5";
    case "warning":
      return "border-amber-400/30 bg-amber-500/5";
    default:
      return "border-app-primary/30 bg-app-primary/5";
  }
}

export function AdminAlerts({ alerts }: AdminAlertsProps) {
  const navigate = useNavigate();

  return (
    <div className="app-card !p-6 md:!p-8 space-y-4">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <h3 className="app-label !text-xs opacity-70">Alertas Operativas</h3>
        <span className="text-xs text-app-text-muted">
          {alerts.length} incidencia(s)
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/5 px-4 py-5">
          <p className="text-sm font-semibold text-emerald-300">
            Operacion saludable
          </p>
          <p className="mt-1 text-sm text-app-text-muted">
            No se detectaron incidencias criticas en vouchers, canje ni
            sesiones.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-app-text-muted">
            <li>• Stock de vouchers dentro de rango</li>
            <li>• Sin vencimientos urgentes reportados</li>
            <li>• Sin acumulacion critica de sesiones pendientes</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border px-4 py-4 ${getSeverityStyles(alert.severity)}`}
            >
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-app-text-main">
                    {alert.title}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted leading-relaxed">
                    {alert.description}
                  </p>
                </div>
                <button
                  onClick={() => navigate(alert.actionPath)}
                  className="inline-flex w-full sm:w-auto justify-center sm:justify-start items-center gap-1 rounded-lg border border-app-border bg-app-bg/30 px-2 py-1 text-[11px] font-semibold text-app-text-main hover:border-app-primary/40 hover:text-app-primary transition-colors self-start whitespace-normal break-words"
                >
                  {alert.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
