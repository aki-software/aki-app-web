import {
    Building2,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    CreditCard,
    UserRound,
} from "lucide-react";
import type { SessionData } from "../../api/dashboard";

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
      return "Directo";
    case "VOUCHER_REDEEMED":
      return "Voucher";
    default:
      return status;
  }
}

function sourceLabel(session: SessionData): string {
  if (session.institutionName) return session.institutionName;
  if (session.therapistName) return `Terapeuta: ${session.therapistName}`;
  return "Sin asignación";
}

function voucherUsageLabel(session: SessionData): string {
  return session.voucherCode
    ? `Con voucher (${session.voucherCode})`
    : "Sin voucher";
}

interface Props {
  userName: string;
  userSessions: SessionData[];
  isExpanded: boolean;
  onToggle: () => void;
  onOpenDetail: (sessionId: string) => void;
}

export function UserSessionGroup({
  userName,
  userSessions,
  isExpanded,
  onToggle,
  onOpenDetail,
}: Props) {
  const lastSession = userSessions[0];

  return (
    <div
      className={`app-card overflow-hidden transition-all duration-500 mb-6 p-0 group ${isExpanded ? "ring-2 ring-app-primary/20 shadow-2xl scale-[1.005]" : "shadow-lg hover:shadow-2xl hover:scale-[1.002]"}`}
    >
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center px-10 py-8 transition-colors hover:bg-app-bg/10 select-none"
      >
        <div className="flex-[2] flex items-center">
          <div className="mr-8 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-app-bg border border-app-border font-black text-app-primary shadow-sm text-xl group-hover:scale-105 transition-transform duration-500">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            {/* Sistema Maestro de Valor */}
            <div className="app-value !text-xl group-hover:text-app-primary transition-colors">
              {userName}
            </div>
            {/* Sistema Maestro de Etiqueta */}
            <div className="app-label mt-2 opacity-60">
              {lastSession.paymentStatus === "PAID" &&
              !lastSession.institutionName
                ? "Pago individual / Sin asignación"
                : sourceLabel(lastSession)}
            </div>
          </div>
        </div>

        <div className="flex flex-1 justify-center hidden md:flex">
          <span className="app-tag !px-4 !py-1.5 opacity-80 group-hover:opacity-100 group-hover:border-app-primary/50 transition-all font-black">
            {userSessions.length} {userSessions.length === 1 ? "Test" : "Tests"}
          </span>
        </div>

        <div className="flex-1 text-center font-mono text-xs font-black text-app-text-muted/60 group-hover:text-app-text-muted transition-colors uppercase tracking-widest">
          {formatDate(lastSession.sessionDate)}
        </div>

        <div className="flex w-12 justify-end">
          <div
            className={`rounded-xl p-3 transition-all ${isExpanded ? "bg-app-primary text-white shadow-lg" : "text-app-text-muted group-hover:bg-app-bg"}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="animate-in border-t border-app-border bg-app-bg/20 duration-500">
          <div className="divide-y divide-app-border">
            {userSessions.map((session, idx) => (
              <div
                key={session.id}
                className="flex flex-col gap-10 px-10 py-10 lg:flex-row lg:items-center lg:justify-between group/session hover:bg-app-surface transition-colors"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center gap-8">
                    <span className="app-label opacity-40">
                      Ronda {userSessions.length - idx}
                    </span>

                    <span className="flex items-center text-xs font-bold text-app-text-main group-hover/session:text-app-primary transition-colors">
                      <Calendar className="mr-3 h-4 w-4 text-app-text-muted" />
                      {formatDate(session.sessionDate)}
                    </span>
                    <span className="flex items-center text-xs font-bold text-app-text-main">
                      <Clock className="mr-3 h-4 w-4 text-app-text-muted" />
                      {formatTime(session.totalTimeMs)}
                    </span>

                    {/* Código Holland como TAG Lux 3.0 */}
                    <span className="app-tag !bg-app-surface !text-app-text-main !border-app-border !px-4 !py-1.5 shadow-sm scale-105">
                      {session.hollandCode}
                    </span>

                    <span
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                        session.paymentStatus === "PAID"
                          ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                          : "text-app-primary border-app-primary/20 bg-app-primary/5"
                      }`}
                    >
                      {paymentLabel(session.paymentStatus)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-8">
                    {[
                      {
                        icon: Building2,
                        label: "Origen",
                        val: sourceLabel(session),
                      },
                      {
                        icon: UserRound,
                        label: "Profesional",
                        val: session.therapistName ?? "Sin terapeuta",
                      },
                      {
                        icon: CreditCard,
                        label: "Voucher",
                        val: voucherUsageLabel(session),
                      },
                    ].map((info, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 group/info"
                      >
                        <info.icon className="h-4 w-4 text-app-text-muted opacity-40 group-hover/info:text-app-primary transition-colors" />
                        <div className="flex flex-col">
                          <span className="app-label !text-[8px] opacity-40 mb-1">
                            {info.label}
                          </span>
                          <span className="text-[10px] font-bold text-app-text-main uppercase tracking-wider">
                            {info.val}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenDetail(session.id);
                  }}
                  className="app-button-primary inline-flex items-center justify-center rounded-2xl px-8 py-4 text-[10px] font-black uppercase tracking-[0.16em] hover:shadow-2xl hover:shadow-app-primary/20 hover:scale-105 active:scale-95"
                >
                  Analizar Perfil Clínico
                  <ChevronRight className="ml-3 h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
