import { AdminActivityEvent } from "@akit/contracts";
import {
    Activity,
    ChevronRight,
    ClipboardList,
    MessageSquare,
    Ticket,
} from "lucide-react";
import { Link } from "react-router-dom";

interface ActivityFeedProps {
  events: AdminActivityEvent[];
}

function getIcon(type: AdminActivityEvent["type"]) {
  switch (type) {
    case "VOUCHER_REDEEMED":
      return <Ticket className="h-4 w-4 text-emerald-500" />;
    case "VOUCHER_ISSUED":
      return <Ticket className="h-4 w-4 text-app-primary" />;
    case "SESSION_COMPLETED":
      return <ClipboardList className="h-4 w-4 text-emerald-500" />;
    case "SESSION_STARTED":
      return <Activity className="h-4 w-4 text-amber-500" />;
    default:
      return <MessageSquare className="h-4 w-4 text-app-text-muted" />;
  }
}

function toRelativeTimestamp(isoDate: string): string {
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "fecha no disponible";
  }

  if (parsedDate.getUTCFullYear() <= 1971) {
    return "fecha no disponible";
  }

  const elapsedMs = Date.now() - parsedDate.getTime();

  // If timestamps come ahead due to timezone skew, avoid misleading "justo ahora".
  if (elapsedMs < 0) {
    return toAbsoluteTimestamp(isoDate);
  }

  if (elapsedMs < 5_000) {
    return "justo ahora";
  }

  if (elapsedMs < 60_000) {
    const seconds = Math.max(1, Math.floor(elapsedMs / 1000));
    return `hace ${seconds} s`;
  }

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `hace ${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return `hace ${days} dia(s)`;
}

function toAbsoluteTimestamp(isoDate: string): string {
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Fecha no disponible";
  }

  if (parsedDate.getUTCFullYear() <= 1971) {
    return "Fecha no disponible";
  }

  return parsedDate.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="app-card !p-0 overflow-hidden shadow-2xl flex flex-col h-full border-app-border bg-app-surface">
      <div className="px-8 py-6 border-b border-app-border flex items-center justify-between bg-app-bg/10">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="app-label !text-xs opacity-60">Actividad Operativa</h3>
        </div>
        <Link
          to="/dashboard/activity"
          className="text-[10px] font-black uppercase tracking-widest text-app-primary hover:underline transition-all"
        >
          Ver historial
        </Link>
      </div>

      <div className="divide-y divide-app-border overflow-y-auto max-h-[400px]">
        {events.length === 0 ? (
          <div className="px-8 py-10 text-center text-sm text-app-text-muted">
            Sin actividad reciente registrada.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="px-8 py-5 flex items-start gap-5 hover:bg-app-bg/30 transition-all cursor-pointer group"
            >
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-xl bg-app-bg border border-app-border flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-app-primary/20 transition-all">
                  {getIcon(event.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black text-app-text-main uppercase tracking-tight">
                    {event.title}
                  </span>
                  <span
                    title={toAbsoluteTimestamp(event.occurredAt)}
                    className="text-[9px] font-black text-app-text-muted opacity-40 uppercase tracking-widest"
                  >
                    {toRelativeTimestamp(event.occurredAt)}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-app-text-muted leading-relaxed line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  {event.description}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-app-text-muted opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          ))
        )}
      </div>

      <div className="mt-auto px-8 py-5 bg-app-bg/5 border-t border-app-border flex items-center justify-center">
        <p className="app-label !text-[9px] opacity-40">
          Eventos recientes de vouchers, sesiones e informes
        </p>
      </div>
    </div>
  );
}
