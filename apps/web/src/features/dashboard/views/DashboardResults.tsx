import { FileSpreadsheet, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { fetchSessionsList, type SessionData } from "../api/dashboard";
import { STATUS_OPTIONS, RESULTS_UI_TEXTS, type StatusFilter } from "../constants/results.constants";
import { Button } from "../../../components/atoms/Button";
import { Spinner } from "../../../components/atoms/Spinner";
import { Select } from "../../../components/atoms/Select";
import { SearchInput } from "../../../components/molecules/SearchInput";
import { StatCard } from "../../../components/molecules/StatCard";
import { UserSessionGroup } from "../components/results/UserSessionGroup";

const hasSessionResult = (s: SessionData) => (s.results?.length ?? 0) > 0;
const isReportUnlocked = (s: SessionData) => Boolean(s.reportUnlockedAt);

export function DashboardResults() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isInstitution = !!user?.institutionId && user.role?.toUpperCase() !== "ADMIN";
  const uiTexts = RESULTS_UI_TEXTS;

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSessionsList()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  const toggleUserExpansion = (userName: string) => {
    setExpandedUsers((prev) => ({ ...prev, [userName]: !prev[userName] }));
  };

  const groupedSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = sessions.filter((session) => {
      const completed = hasSessionResult(session);
      const unlocked = isReportUnlocked(session);

      if (statusFilter === "STARTED" && completed) return false;
      if (statusFilter === "COMPLETED" && !completed) return false;
      if (statusFilter === "REPORT_UNLOCKED" && !unlocked) return false;
      if (!term) return true;

      return [
        session.patientName, session.hollandCode, session.paymentStatus,
        session.institutionName, session.therapistName, session.voucherCode,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    });

    const groups: Record<string, SessionData[]> = {};
    filtered.forEach((session) => {
      if (!groups[session.patientName]) groups[session.patientName] = [];
      groups[session.patientName].push(session);
    });

    return Object.entries(groups).map(([name, list]) => {
      return [name, list.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())] as const;
    }).sort((a, b) => new Date(b[1][0].sessionDate).getTime() - new Date(a[1][0].sessionDate).getTime());
  }, [searchTerm, sessions, statusFilter]);

  const filteredSessionsCount = useMemo(
    () => groupedSessions.reduce((acc, [, list]) => acc + list.length, 0),
    [groupedSessions]
  );
  
  return (
    <div className="space-y-10">
      
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center border-b border-app-border pb-10">
        <div>
          <h2 className="text-3xl font-black text-app-text-main tracking-tight">
            {uiTexts.header.title}
          </h2>
          <p className="mt-2 text-sm font-medium text-app-text-muted max-w-2xl leading-relaxed">
            {isInstitution ? uiTexts.header.subtitleInstitution : uiTexts.header.subtitleAdmin}
          </p>
        </div>
        <Button variant="outline" className="px-6 shadow-sm">
          <FileSpreadsheet className="mr-3 h-4 w-4 text-emerald-500" />
          Exportar Reporte
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[200px]">
          <StatCard label={uiTexts.metrics.patients} value={groupedSessions.length} />
        </div>
        <div className="min-w-[200px]">
          <StatCard label={uiTexts.metrics.tests} value={filteredSessionsCount} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4 items-end">
          <div className="lg:col-span-3">
             <span className="app-label mb-2 block">Buscar</span>
             <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente, código Holland, terapeuta u organización..."
            />
          </div>

          <Select
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-xs font-semibold text-app-text-muted">
          Mostrando {filteredSessionsCount} test(s) de {sessions.length} total(es).
        </div>
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner size="lg" className="border-app-primary" />
            </div>
          ) : groupedSessions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-app-text-muted/40">
              <Search className="mb-4 h-12 w-12 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest">{uiTexts.emptyState}</p>
            </div>
          ) : (
            <div className="space-y-1 slide-in-from-bottom-4 duration-500">
              {/* Table Header */}
              <div className="flex items-center px-8 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-app-text-muted/50">
                <div className="flex-[2]">{uiTexts.tableHeaders[0]}</div>
                <div className="flex-1 text-center hidden sm:block">{uiTexts.tableHeaders[1]}</div>
                <div className="flex-1 text-center">{uiTexts.tableHeaders[2]}</div>
                <div className="w-10" />
              </div>

              {groupedSessions.map(([userName, userSessions]) => (
                <UserSessionGroup
                  key={userName}
                  userName={userName}
                  userSessions={userSessions}
                  isExpanded={!!expandedUsers[userName]}
                  onToggle={() => toggleUserExpansion(userName)}
                  onOpenDetail={(id) => navigate(`/dashboard/sessions/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};