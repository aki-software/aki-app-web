import { AdminActivityEvent } from "@akit/contracts";
import {
    Activity,
    ClipboardList,
    MessageSquare,
    RefreshCw,
    Search,
    Ticket,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchAdminActivityHistory } from "../api/dashboard";

type ActivityFilter = "ALL" | AdminActivityEvent["type"];

const FILTER_OPTIONS: Array<{ value: ActivityFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "SESSION_STARTED", label: "Sesiones iniciadas" },
  { value: "SESSION_COMPLETED", label: "Sesiones completadas" },
  { value: "VOUCHER_ISSUED", label: "Vouchers emitidos" },
  { value: "VOUCHER_REDEEMED", label: "Vouchers canjeados" },
];

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

function toReadableTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardActivity() {
  const [events, setEvents] = useState<AdminActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("ALL");

  const loadHistory = async () => {
    setLoading(true);
    const data = await fetchAdminActivityHistory(100);
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const byType =
      filter === "ALL"
        ? events
        : events.filter((event) => event.type === filter);

    if (!term) return byType;

    return byType.filter((event) =>
      [event.title, event.description, event.type]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [events, filter, search]);

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-5 border-b border-app-border pb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="app-label text-app-primary/80">Centro de operacion</p>
          <h2 className="mt-3 text-3xl font-display font-bold tracking-tight text-app-text-main">
            Historial de actividad
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-app-text-muted">
            Eventos recientes de vouchers y sesiones para auditoria operativa.
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-app-border bg-app-surface px-4 py-2 text-xs font-bold uppercase tracking-wide text-app-text-main transition hover:border-app-primary hover:text-app-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </header>

      <div className="relative max-w-lg">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted/50" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por titulo, descripcion o tipo..."
          className="w-full rounded-2xl border border-app-border bg-app-surface py-3 pl-11 pr-4 text-sm text-app-text-main placeholder:text-app-text-muted/60 focus:border-app-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map((option) => {
          const active = option.value === filter;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                active
                  ? "border-app-primary bg-app-primary/15 text-app-primary"
                  : "border-app-border bg-app-surface text-app-text-muted hover:border-app-primary/40 hover:text-app-text-main"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="app-card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-app-primary border-r-transparent" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="px-8 py-14 text-center text-sm text-app-text-muted">
            No se registraron eventos para este filtro.
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-5 sm:px-8"
              >
                <div className="h-10 w-10 rounded-xl border border-app-border bg-app-bg/40 flex items-center justify-center">
                  {getIcon(event.type)}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-app-text-main">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-app-text-muted break-words">
                    {event.description}
                  </p>
                </div>

                <time className="text-xs font-medium text-app-text-muted sm:text-right">
                  {toReadableTimestamp(event.occurredAt)}
                </time>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
