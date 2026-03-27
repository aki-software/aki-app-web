import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Search,
  UserRound,
} from "lucide-react";
import { fetchSessionsList, type SessionData } from "../api/dashboard";
import { HollandResultsModal } from "../components/HollandResultsModal";

function formatDate(dateValue: string | number | Date) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(ms: number) {
  const minutes = Math.floor((ms || 0) / 60000);
  const seconds = Math.floor(((ms || 0) % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function paymentLabel(status: string) {
  switch (status) {
    case "PAID":
      return "Pago directo";
    case "VOUCHER_REDEEMED":
      return "Canjeado con voucher";
    default:
      return status;
  }
}

function paymentClasses(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "VOUCHER_REDEEMED":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

export function DashboardResults() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>(
    {}
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(
    null
  );

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

  const openDetailsModal = (session: SessionData) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Resultados de test
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            El admin sólo ve informes de usuarios huérfanos: casos sin voucher y
            pagados de forma directa.
          </p>
        </div>
        <button className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600 dark:text-green-500" />
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Usuarios
          </div>
          <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            {groupedSessions.length}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Pagos directos
          </div>
          <div className="mt-1 text-xl font-semibold text-emerald-800 dark:text-emerald-200">
            {sessions.filter((session) => session.paymentStatus === "PAID").length}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Sesiones visibles
          </div>
          <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            {sessions.length}
          </div>
        </div>
      </div>

      <div className="flex min-h-[300px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="relative max-w-xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 text-gray-900 placeholder-gray-500 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Buscar por paciente, institución, terapeuta o medio de pago..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <div className="min-h-[300px] overflow-x-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            </div>
          ) : groupedSessions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <Search className="mb-4 h-10 w-10 opacity-20" />
              <p>No se encontraron usuarios o sesiones.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <div className="flex items-center bg-gray-50/80 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                <div className="flex-[2]">Usuario / Paciente</div>
                <div className="flex-1 text-center">Tests</div>
                <div className="flex-1 text-center">Último test</div>
                <div className="w-10" />
              </div>

              {groupedSessions.map(([userName, userSessions]) => {
                const isExpanded = !!expandedUsers[userName];
                const lastSession = userSessions[0];

                return (
                  <div key={userName} className="group">
                    <div
                      onClick={() => toggleUserExpansion(userName)}
                      className={`flex cursor-pointer items-center px-6 py-4 transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10 ${
                        isExpanded ? "bg-blue-50/20 dark:bg-blue-900/5" : ""
                      }`}
                    >
                      <div className="flex-[2] flex items-center">
                        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white shadow-sm">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {userName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Usuario huérfano con pago directo
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-1 justify-center">
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:border-blue-800/50 dark:bg-blue-900/40 dark:text-blue-300">
                          {userSessions.length}{" "}
                          {userSessions.length === 1 ? "Test" : "Tests"}
                        </span>
                      </div>

                      <div className="flex-1 text-center font-mono text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(lastSession.sessionDate)}
                      </div>

                      <div className="flex w-10 justify-end">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                        )}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="animate-in slide-in-from-top-2 overflow-hidden border-y border-gray-100 bg-gray-50/50 duration-200 dark:border-gray-700/50 dark:bg-gray-800/30">
                        <div className="ml-14 divide-y divide-gray-100 px-6 py-2 dark:divide-gray-700/30">
                          {userSessions.map((session, idx) => (
                            <div
                              key={session.id}
                              className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between"
                            >
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                                  <span className="w-16 text-xs font-medium text-gray-400 dark:text-gray-500">
                                    #{userSessions.length - idx}
                                  </span>
                                  <span className="flex items-center">
                                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                                    {formatDate(session.sessionDate)}
                                  </span>
                                  <span className="flex items-center text-gray-600 dark:text-gray-400">
                                    <Clock className="mr-2 h-4 w-4 text-gray-400" />
                                    {formatTime(session.totalTimeMs)}
                                  </span>
                                  <span className="rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-400">
                                    {session.hollandCode}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${paymentClasses(
                                      session.paymentStatus
                                    )}`}
                                  >
                                    {paymentLabel(session.paymentStatus)}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Institución: {session.institutionName ?? "Sin institución"}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <UserRound className="h-3.5 w-3.5" />
                                    Terapeuta: {session.therapistName ?? "No asignado"}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Voucher: {session.voucherCode ?? "No aplica"}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openDetailsModal(session);
                                }}
                                className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-600 hover:text-white dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-600"
                              >
                                Ver perfil
                                <ChevronRight className="ml-1 h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <HollandResultsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        session={selectedSession}
      />
    </div>
  );
}
