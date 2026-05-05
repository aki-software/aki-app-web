import { AdminAlert } from "@akit/contracts";
import { AlertOctagon, AlertTriangle, ArrowRight, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../../components/atoms/Button";

interface AdminAlertsProps {
  alerts: AdminAlert[];
}

// Helpers visuales locales (está perfecto que vivan acá porque son exclusivos de AdminAlert)
function getSeverityIcon(severity: AdminAlert["severity"]) {
  switch (severity) {
    case "critical":
      return <AlertOctagon className="h-5 w-5 text-red-400" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    default:
      return <Info className="h-5 w-5 text-app-primary" />;
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
    <div className="app-card !p-6 md:!p-8 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 min-w-0 mb-2">
        <h3 className="app-label !text-xs opacity-70">Alertas Operativas</h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">
          {alerts.length} incidencia(s)
        </span>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/5 px-5 py-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-bold tracking-wide text-emerald-300 uppercase">
                Operación estable
              </p>
            </div>
            <p className="mt-1 text-sm text-app-text-muted">
              No se detectaron incidencias relevantes en canje, vencimientos o
              sesiones del periodo.
            </p>
            <ul className="mt-4 space-y-2 text-xs font-medium text-app-text-muted/70">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500/50">✓</span> Sin vouchers con vencimiento cercano
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500/50">✓</span> Sin sesiones demoradas para cierre
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500/50">✓</span> Sin desvío crítico en la tasa de canje
              </li>
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-2xl border px-5 py-5 transition-all hover:scale-[1.01] ${getSeverityStyles(alert.severity)}`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="shrink-0 p-2 bg-app-bg/50 rounded-xl border border-app-border/50">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-app-text-main">
                      {alert.title}
                    </p>
                    <p className="mt-1 text-xs font-medium text-app-text-muted leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                  
                  {/* Reemplazamos el button crudo por nuestra Molécula/Átomo */}
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto !py-2 !px-4 !text-[11px]"
                    onClick={() => navigate(alert.actionPath)}
                  >
                    {alert.actionLabel}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}