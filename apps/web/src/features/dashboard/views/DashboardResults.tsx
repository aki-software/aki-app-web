import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, Search, Users2, Activity } from "lucide-react";
import { fetchSessionsList, type SessionData } from "../api/dashboard";
import { useAuth } from "../../auth/hooks/useAuth";
import { UserSessionGroup } from "../components/results/UserSessionGroup";

export function DashboardResults() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInstitution = !!user?.institutionId && user.role?.toUpperCase() !== "ADMIN";
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSessionsList().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  const toggleUserExpansion = (userName: string) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [userName]: !prev[userName],
    }));
  };

  const groupedSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = sessions.filter((session) => {
      if (!term) return true;

      return [
        session.patientName,
        session.hollandCode,
        session.paymentStatus,
        session.institutionName,
        session.therapistName,
        session.voucherCode,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });

    const groups: Record<string, SessionData[]> = {};
    filtered.forEach((session) => {
      if (!groups[session.patientName]) {
        groups[session.patientName] = [];
      }
      groups[session.patientName].push(session);
    });

    Object.values(groups).forEach((group) => {
      group.sort(
        (a, b) =>
          new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
      );
    });

    return Object.entries(groups).sort((a, b) => {
      const lastA = new Date(a[1][0].sessionDate).getTime();
      const lastB = new Date(b[1][0].sessionDate).getTime();
      return lastB - lastA;
    });
  }, [searchTerm, sessions]);

  const openSessionDetail = (sessionId: string) => {
    navigate(`/dashboard/sessions/${sessionId}`);
  };

  return (
    <div className="space-y-10">
      {/* ─── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center border-b border-app-border pb-10">
        <div>
          <h2 className="text-3xl font-black text-app-text-main tracking-tight">
            Pacientes y Tests
          </h2>
          <p className="mt-2 text-sm font-medium text-app-text-muted max-w-2xl leading-relaxed">
            {isInstitution
              ? "Supervisión técnica de los procesos vocacionales realizados por tus pacientes."
              : "Considilado global de actividad: incluye clientes directos y derivaciones institucionales."}
          </p>
        </div>
        <button className="inline-flex items-center justify-center rounded-2xl border border-app-border bg-app-surface px-6 py-3 text-xs font-black uppercase tracking-widest text-app-text-main shadow-sm transition-all hover:border-app-primary hover:text-app-primary">
          <FileSpreadsheet className="mr-3 h-4 w-4 text-emerald-500" />
          Exportar Reporte
        </button>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4">
        <div className="app-card py-4 px-6 min-w-[200px] shadow-lg shadow-app-primary/5">
          <div className="flex items-center gap-3 mb-2">
            <Users2 className="h-4 w-4 text-app-primary/40" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">Pacientes</span>
          </div>
          <div className="text-2xl font-black text-app-text-main tracking-tighter">
            {groupedSessions.length}
          </div>
        </div>
        
        <div className="app-card py-4 px-6 min-w-[200px] shadow-lg shadow-app-primary/5">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-4 w-4 text-app-primary/40" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">Tests Totales</span>
          </div>
          <div className="text-2xl font-black text-app-text-main tracking-tighter">
            {sessions.length}
          </div>
        </div>
      </div>

      {/* ─── Search & List Container ────────────────────────────────── */}
      <div className="space-y-6">
        <div className="relative max-w-2xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-4 w-4 text-app-text-muted/40" />
          </div>
          <input
            type="text"
            className="block w-full rounded-2xl border border-app-border bg-app-surface py-4 pl-12 pr-4 text-sm font-medium text-app-text-main placeholder-app-text-muted/50 transition-all focus:border-app-primary focus:outline-none focus:ring-4 focus:ring-app-primary/5"
            placeholder="Buscar paciente, código Holland o terapeuta..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-app-primary border-r-transparent" />
            </div>
          ) : groupedSessions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-app-text-muted/40">
              <Search className="mb-4 h-12 w-12 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest">No se detectaron coincidencias</p>
            </div>
          ) : (
            <div className="space-y-1 slide-in-from-bottom-4 duration-500">
               {/* Table Header Header */}
              <div className="flex items-center px-8 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-app-text-muted/50">
                <div className="flex-[2]">Usuario / Paciente</div>
                <div className="flex-1 text-center hidden sm:block">Tests</div>
                <div className="flex-1 text-center">Última Actividad</div>
                <div className="w-10" />
              </div>

              {groupedSessions.map(([userName, userSessions]) => (
                <UserSessionGroup
                  key={userName}
                  userName={userName}
                  userSessions={userSessions}
                  isExpanded={!!expandedUsers[userName]}
                  onToggle={() => toggleUserExpansion(userName)}
                  onOpenDetail={openSessionDetail}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
