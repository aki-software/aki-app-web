import { AlertTriangle, ArrowRight, Clock, Ticket, Users2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  fetchInstitutionOverview,
  type InstitutionOverviewResponse,
} from "../api/dashboard";

const PERIOD_DAYS = 7;

function toMs(value: string | Date | number | null | undefined): number | null {
  if (!value) return null;
  const d = new Date(value);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function formatShortDate(value: string | Date | number | null | undefined) {
  const ms = toMs(value);
  if (!ms) return "--";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

type TopSession = InstitutionOverviewResponse["topSessions"][number];

function getSessionChannel(session: TopSession): "VOUCHER" | "INDIVIDUAL" {
  return session.voucherCode || session.paymentStatus === "VOUCHER_REDEEMED"
    ? "VOUCHER"
    : "INDIVIDUAL";
}

function getSessionStatusLabel(session: TopSession): string {
  if (session.reportUnlockedAt) return "Informe desbloqueado";
  if ((session.resultsCount ?? 0) > 0) return "Completado";
  return "Iniciado";
}

export function InstitutionDashboardOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<InstitutionOverviewResponse | null>(
    null,
  );

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!user?.institutionId) {
          setOverview(null);
          return;
        }

        const data = await fetchInstitutionOverview({
          institutionId: user.institutionId,
          days: PERIOD_DAYS,
        });
        if (!isActive) return;
        setOverview(data);
      } catch (error) {
        console.error("Error loading institution dashboard data:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();
    return () => {
      isActive = false;
    };
  }, [user?.institutionId]);

  const voucherStats = overview?.vouchers;
  const testsStats = overview?.tests;

  const showLowStockAlert = useMemo(() => {
    if (!voucherStats || voucherStats.total <= 0) return false;
    return voucherStats.available / voucherStats.total <= 0.1;
  }, [voucherStats]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-app-primary border-t-transparent" />
        <span className="app-label !text-xs tracking-[0.25em] animate-pulse">
          Sincronizando panel operativo
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-app-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Ticket className="h-5 w-5 text-app-primary" />
            <span className="app-label !text-app-primary">Dashboard de institución</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-app-text-main tracking-tight leading-none max-w-3xl">
            Operación y consumo
          </h2>
          <p className="mt-3 text-sm font-medium text-app-text-muted max-w-2xl leading-relaxed">
            Seguimiento de vouchers, alertas y tests recientes.
          </p>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/25 border border-app-border backdrop-blur-xl">
          <Users2 className="h-4 w-4 text-app-text-muted opacity-40" />
          <span className="app-label !text-[10px] opacity-60 uppercase">
            {user?.name ?? "Institución"}
          </span>
        </div>
      </div>

      {showLowStockAlert ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-amber-200 uppercase tracking-wider">
                Alerta de consumo
              </p>
              <p className="mt-1 text-sm font-medium text-app-text-muted">
                Quedan {voucherStats?.available ?? 0} voucher(s) disponible(s) de {voucherStats?.total ?? 0}.
                Cuando el disponible global baja del 10% conviene planificar una reposición.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Link
                  to="/dashboard/vouchers"
                  className="inline-flex items-center justify-center rounded-2xl border border-app-border bg-app-surface px-5 py-3 text-xs font-black uppercase tracking-widest text-app-text-main shadow-sm transition-all hover:border-app-primary hover:text-app-primary"
                >
                  Ver vouchers
                  <ArrowRight className="ml-3 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-label opacity-60 tracking-[0.2em]">Vouchers</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-app-text-main">
              Stock y métricas (últimos {overview?.periodDays ?? PERIOD_DAYS} días)
            </h3>
          </div>
          <button
            onClick={() => navigate("/dashboard/vouchers")}
            className="inline-flex items-center justify-center rounded-2xl border border-app-border bg-app-surface px-5 py-3 text-xs font-black uppercase tracking-widest text-app-text-main shadow-sm transition-all hover:border-app-primary hover:text-app-primary"
          >
            Ir a vouchers
            <ArrowRight className="ml-3 h-4 w-4" />
          </button>
        </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="app-card py-5 px-6">
              <p className="app-label opacity-50">Disponibles</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-emerald-200">
                {voucherStats?.available ?? 0}
              </p>
              <p className="mt-2 text-xs text-app-text-muted">
                De {voucherStats?.total ?? 0} recibidos.
              </p>
            </div>
            <div className="app-card py-5 px-6">
              <p className="app-label opacity-50">Consumidos</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-rose-200">
                {voucherStats?.used ?? 0}
              </p>
              <p className="mt-2 text-xs text-app-text-muted">Histórico.</p>
            </div>
            <div className="app-card py-5 px-6">
              <p className="app-label opacity-50">Recibidos (período)</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-app-text-main">
                {voucherStats?.vouchersGeneratedPeriod ?? 0}
              </p>
              <p className="mt-2 text-xs text-app-text-muted">
                Últimos {overview?.periodDays ?? PERIOD_DAYS} días.
              </p>
            </div>
            <div className="app-card py-5 px-6">
              <p className="app-label opacity-50">Consumidos (período)</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-app-text-main">
                {voucherStats?.vouchersRedeemedPeriod ?? 0}
              </p>
              <p className="mt-2 text-xs text-app-text-muted">
                Tasa de consumo: {voucherStats?.voucherRedemptionRatePeriod ?? 0}%.
              </p>
            </div>
          </div>

         <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
           <div className="app-card py-5 px-6">
             <div className="flex items-center gap-3">
               <Clock className="h-4 w-4 text-app-text-muted/40" />
               <p className="app-label opacity-50">Vencen en 7 días</p>
             </div>
             <p className="mt-2 text-2xl font-black tracking-tight text-app-text-main">
              {voucherStats?.vouchersExpiringSoon7d ?? 0}
             </p>
           </div>
           <div className="app-card py-5 px-6">
             <p className="app-label opacity-50">Sin asignar</p>
             <p className="mt-2 text-2xl font-black tracking-tight text-app-text-main">
              {voucherStats?.vouchersUnassignedAvailable ?? 0}
             </p>
             <p className="mt-2 text-xs text-app-text-muted">
               Vouchers disponibles sin paciente.
             </p>
           </div>
          <div className="app-card py-5 px-6">
            <p className="app-label opacity-50">Vencidos</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-app-text-main">
              {voucherStats?.expired ?? 0}
            </p>
            <p className="mt-2 text-xs text-app-text-muted">Histórico.</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-label opacity-60 tracking-[0.2em]">Tests</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-app-text-main">
              Recientes (top 10)
            </h3>
          </div>

          <Link
            to="/dashboard/results"
            className="inline-flex items-center justify-center rounded-2xl border border-app-border bg-app-surface px-5 py-3 text-xs font-black uppercase tracking-widest text-app-text-main shadow-sm transition-all hover:border-app-primary hover:text-app-primary"
          >
            Ver todos
            <ArrowRight className="ml-3 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="app-card py-5 px-6">
            <p className="app-label opacity-50">Iniciados</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-app-text-main">
              {testsStats?.testsStartedPeriod ?? 0}
            </p>
            <p className="mt-2 text-xs text-app-text-muted">
              Últimos {overview?.periodDays ?? PERIOD_DAYS} días.
            </p>
          </div>
          <div className="app-card py-5 px-6">
            <p className="app-label opacity-50">Completados</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-app-text-main">
              {testsStats?.testsCompletedPeriod ?? 0}
            </p>
          </div>
          <div className="app-card py-5 px-6">
            <p className="app-label opacity-50">Informes desbloqueados</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-app-text-main">
              {testsStats?.reportsUnlockedPeriod ?? 0}
            </p>
          </div>
        </div>

        <div className="app-card !p-0 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-app-bg/50 border-b border-app-border">
                <tr>
                  <th className="px-6 py-5 app-label opacity-40">Paciente</th>
                  <th className="px-6 py-5 app-label opacity-40">Fecha</th>
                  <th className="px-6 py-5 app-label opacity-40">Código</th>
                  <th className="px-6 py-5 app-label opacity-40">Canal</th>
                  <th className="px-6 py-5 app-label opacity-40">Estado</th>
                  <th className="px-6 py-5 app-label opacity-40 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border bg-app-surface">
                {(overview?.topSessions?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center opacity-40">
                      <p className="app-label">Todavía no hay tests registrados.</p>
                    </td>
                  </tr>
                ) : (
                  (overview?.topSessions ?? []).map((s) => (
                    <tr key={s.id} className="hover:bg-black/10 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-app-text-main">
                        {s.patientName}
                      </td>
                      <td className="px-6 py-4 text-xs text-app-text-muted">
                        {formatShortDate(s.sessionDate ?? s.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-xs font-black tracking-widest text-app-text-main">
                        {s.hollandCode}
                      </td>
                      <td className="px-6 py-4 text-xs text-app-text-muted">
                        {getSessionChannel(s) === "VOUCHER" ? "Con voucher" : "Pago individual"}
                      </td>
                      <td className="px-6 py-4 text-xs text-app-text-muted">
                        {getSessionStatusLabel(s)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/dashboard/sessions/${s.id}`)}
                          className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-bg px-4 py-2 text-[10px] font-black uppercase tracking-widest text-app-text-main transition-all hover:border-app-primary hover:text-app-primary"
                        >
                          Abrir
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
