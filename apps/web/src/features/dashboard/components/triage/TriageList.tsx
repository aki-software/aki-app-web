import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTriageSessions } from "../../api/sessions.api";
import type { TriageSession, TriageResponse } from "@akit/contracts";
import { TriageBadge } from "./TriageBadge";
import { formatDate } from "../../../../utils/date";

export function TriageList() {
  const navigate = useNavigate();
  const [data, setData] = useState<TriageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTriageSessions({ page: 1, limit: 10 }).then((res) => {
      if (active) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="app-card !p-6 md:!p-8 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="app-label !text-xs opacity-70">Alertas de Sesión</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-app-bg border border-app-border animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const sessions = data?.data ?? [];
  const flaggedCount = data?.meta?.flaggedCount ?? 0;

  if (sessions.length === 0) {
    return (
      <div className="app-card !p-6 md:!p-8 space-y-4 flex flex-col">
        <div className="flex items-center justify-between gap-3 min-w-0 mb-2">
          <h3 className="app-label !text-xs opacity-70">Alertas de Sesión</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-status-success">
            0 incidencias
          </span>
        </div>
        <div className="rounded-2xl border border-status-success/25 bg-status-success/5 px-5 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
            <p className="text-sm font-bold tracking-wide text-status-success uppercase">
              Sin alertas
            </p>
          </div>
          <p className="text-sm text-app-text-muted">
            Todas las sesiones sin alertas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-card !p-6 md:!p-8 space-y-4 flex flex-col">
      <div className="flex items-center justify-between gap-3 min-w-0 mb-2">
        <h3 className="app-label !text-xs opacity-70">Alertas de Sesión</h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-status-error">
          {flaggedCount} incidencia(s)
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-2">
        {sessions.map((session: TriageSession) => {
          const flags = session.flags ?? [];

          return (
            <div
              key={session.sessionId}
              onClick={() => navigate(`/dashboard/sessions/${session.sessionId}`)}
              className="rounded-2xl border border-app-border bg-app-bg px-5 py-4 transition-all hover:shadow-md hover:border-app-primary/30 cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-app-text-main truncate">
                    {session.patientName}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs font-medium text-app-text-muted/80">
                      {formatDate(session.sessionDate)}
                    </span>
                    <span className="text-xs font-black text-app-primary uppercase tracking-wider">
                      {session.hollandCode}
                    </span>
                    {session.totalTimeMs > 0 && (
                      <span className="text-xs font-medium text-app-text-muted/70">
                        {Math.round(session.totalTimeMs / 60000)}min
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {flags.map((flag) => (
                    <TriageBadge key={flag} flag={flag} />
                  ))}
                  <ChevronRight className="h-4 w-4 text-app-text-muted/60 flex-shrink-0" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
