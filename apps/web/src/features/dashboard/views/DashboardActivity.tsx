import { AdminActivityEvent } from "@akit/contracts";
import { Activity, ClipboardList, MessageSquare, RefreshCw, Ticket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchAdminActivityHistory } from "../api/dashboard";
import { toReadableTimestamp } from "../../../utils/date";
import { Button } from "../../../components/atoms/Button";
import { Spinner } from "../../../components/atoms/Spinner";
import { SearchInput } from "../../../components/molecules/SearchInput";

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
    case "VOUCHER_REDEEMED": return <Ticket className="h-4 w-4 text-emerald-500" />;
    case "VOUCHER_ISSUED": return <Ticket className="h-4 w-4 text-app-primary" />;
    case "SESSION_COMPLETED": return <ClipboardList className="h-4 w-4 text-emerald-500" />;
    case "SESSION_STARTED": return <Activity className="h-4 w-4 text-amber-500" />;
    default: return <MessageSquare className="h-4 w-4 text-app-text-muted" />;
  }
}

export function DashboardActivity() {
  const [events, setEvents] = useState<AdminActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("ALL");

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminActivityHistory(100);
      setEvents(data);
    } catch (error) {
      console.error("Error cargando historial", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const byType = filter === "ALL" ? events : events.filter((e) => e.type === filter);

    if (!term) return byType;

    return byType.filter((event) =>
      [event.title, event.description, event.type].join(" ").toLowerCase().includes(term)
    );
  }, [events, filter, search]);

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-5 border-b border-app-border pb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="app-label text-app-primary/80">Centro de operación</p>
          <h2 className="mt-3 text-3xl font-display font-bold tracking-tight text-app-text-main">
            Historial de actividad
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-app-text-muted">
            Eventos recientes de vouchers y sesiones para auditoría operativa.
          </p>
        </div>
        <Button 
          onClick={loadHistory} 
          variant="outline"
          className="max-w-[160px] text-xs font-bold uppercase tracking-wide hover:border-app-primary hover:text-app-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </header>
      <div className="flex flex-col gap-4">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, descripción o tipo..."
        />

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map(({ value, label }) => {
            const active = value === filter;
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                  active
                    ? "border-app-primary bg-app-primary/15 text-app-primary"
                    : "border-app-border bg-app-surface text-app-text-muted hover:border-app-primary/40 hover:text-app-text-main"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="app-card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Spinner size="lg" className="border-app-primary" />
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
                className="grid gap-3 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-5 sm:px-8 hover:bg-app-surface/50 transition-colors"
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
};