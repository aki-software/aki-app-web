import {
    Activity,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    CreditCard,
    KeyRound,
    Loader2,
    ShieldCheck,
    Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchSessionDetail, type SessionDetailData } from "../api/dashboard";
import { HollandRadarChart } from "../components/session-detail/HollandRadarChart";
import { SessionCategoryChart } from "../components/session-detail/SessionCategoryChart";
import { SessionReportButton } from "../components/session-detail/SessionReportButton";
import { SessionTopAreas } from "../components/session-detail/SessionTopAreas";
import { useCategories } from "../hooks/useCategories";

function formatDate(value: string | number | Date | undefined | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatTime(ms: number) {
  const minutes = Math.floor((ms || 0) / 60000);
  const seconds = Math.floor(((ms || 0) % 60000) / 1000);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTechnicalData, setShowTechnicalData] = useState(false);
  const { categoriesMap, loading: categoriesLoading } = useCategories();

  useEffect(() => {
    if (!id) return;
    fetchSessionDetail(id).then((data) => {
      setSession(data);
      setLoading(false);
    });
  }, [id]);

  const behaviorStats = useMemo(() => {
    if (!session?.swipes || session.swipes.length === 0) return null;
    const swipes = session.swipes;
    const cardIds = swipes.map((s) => s.cardId);
    const uniqueCards = new Set(cardIds);
    const undosCount = cardIds.length - uniqueCards.size;
    const durations: number[] = [];
    for (let i = 1; i < swipes.length; i++) {
      if (swipes[i].timestamp && swipes[i - 1].timestamp) {
        const diff =
          new Date(swipes[i].timestamp!).getTime() -
          new Date(swipes[i - 1].timestamp!).getTime();
        if (diff > 0 && diff < 300000) durations.push(diff);
      }
    }
    return {
      undosCount,
      minTime: durations.length > 0 ? Math.min(...durations) : null,
      maxTime: durations.length > 0 ? Math.max(...durations) : null,
      avgTime:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : null,
      reliabilityLevel:
        undosCount > 10 ? "Baja" : undosCount > 5 ? "Variable" : "Muy Alta",
    };
  }, [session]);

  const resultsRecord = useMemo(() => {
    const record: Record<string, number> = {};
    session?.results?.forEach((r) => {
      record[r.categoryId.toUpperCase()] = r.percentage;
    });
    return record;
  }, [session]);

  if (loading || categoriesLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <Loader2 className="h-12 w-12 animate-spin text-app-primary" />
        <span className="app-label mt-4 opacity-50">
          Generando Analítica Lux 3.0
        </span>
      </div>
    );
  }

  if (!session) return null;

  const allCategories = Object.keys(categoriesMap).filter((k) => k !== "...");
  const sortedResults = [...allCategories]
    .map((cat) => ({ cat, pct: resultsRecord[cat] ?? 0 }))
    .sort((a, b) => b.pct - a.pct);

  const top3 = sortedResults.slice(0, 3);
  const bottom3 = sortedResults.slice(-3).reverse();

  return (
    <div className="mx-auto max-w-7xl pb-24 animate-in">
      {/* ─── Luxury Header 3.0 ────────────────────────────────────── */}
      <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between border-b border-app-border pb-16 mb-16">
        <div className="flex items-center gap-10">
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver a la vista anterior"
            title="Volver"
            className="group flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-app-border bg-app-surface text-app-text-muted shadow-lg transition-all duration-500 hover:border-app-primary hover:text-app-primary hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="h-2 w-10 bg-app-primary rounded-full"></div>
              <span className="app-label">DETALLE DEL TEST</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-app-text-main leading-none">
              {session.patientName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="hidden lg:flex flex-col items-end border-r border-app-border pr-12">
            <span className="app-label mb-3 opacity-40">CÓDIGO HOLLAND</span>
            <span className="app-value !text-4xl">{session.hollandCode}</span>
          </div>
          <SessionReportButton sessionId={session.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* ─── Columna de Diagnóstico ───────────────────── */}
        <div className="lg:col-span-12 xl:col-span-12 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Radar Card Lux 3.0 */}
            <div className="app-card shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="app-value !text-2xl mt-0">Perfil RIASEC</h3>
                  <p className="app-label mt-3 opacity-60">
                    DISTRIBUCION DE INTERESES VOCACIONALES
                  </p>
                </div>
                <div className="rounded-2xl bg-app-bg p-4 border border-app-border flex items-center justify-center transition-transform group-hover:rotate-12">
                  <Activity className="h-8 w-8 text-app-primary/60" />
                </div>
              </div>

              <div className="flex justify-center">
                <HollandRadarChart results={resultsRecord} />
              </div>

              <div className="mt-12 grid grid-cols-2 gap-8 border-t border-app-border pt-12">
                <div className="flex flex-col items-center text-center">
                  <span className="app-label mb-3 opacity-40">
                    FECHA DE SESIÓN
                  </span>
                  <span className="text-sm font-black text-app-text-main uppercase tracking-widest">
                    {formatDate(session.sessionDate)}
                  </span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="app-label mb-3 opacity-40">
                    TIEMPO EJECUCIÓN
                  </span>
                  <span className="text-sm font-black text-app-text-main uppercase tracking-widest">
                    {formatTime(session.totalTimeMs)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sello de Fiabilidad Lux 3.0 (ALINEADO Y CENTRADO) */}
            <div className="app-card shadow-2xl border-l-[8px] !border-l-emerald-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-6 mb-12">
                  <div className="rounded-2xl bg-app-bg p-4 border border-app-border shadow-xl">
                    <ShieldCheck className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="app-value !text-2xl mt-0">
                      Consistencia de Respuestas
                    </h4>
                    <p className="app-label mt-2">
                      Confiabilidad estimada:{" "}
                      <b className="text-emerald-500">
                        {behaviorStats?.reliabilityLevel}
                      </b>
                    </p>
                  </div>
                </div>

                <div className="space-y-12 py-4">
                  <div className="flex flex-col items-center">
                    <div className="flex justify-between items-center w-full mb-4">
                      <span className="app-label opacity-60">
                        CAMBIOS DE RESPUESTA
                      </span>
                      <span className="app-tag !bg-app-bg !text-app-text-main !border-app-border !text-[11px] !px-4 !py-1 transition-all group-hover:scale-105 active:scale-95">
                        {behaviorStats?.undosCount} retrocesos
                      </span>
                    </div>
                    <div className="h-3 w-full bg-app-bg border border-app-border rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        style={{
                          width: `${Math.max(5, 100 - (behaviorStats?.undosCount || 0) * 8)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex justify-between items-center w-full mb-4">
                      <span className="app-label opacity-60">
                        VELOCIDAD PROMEDIO
                      </span>
                      <span className="app-tag !text-[11px] !px-4 !py-1">
                        {behaviorStats?.avgTime
                          ? formatTime(behaviorStats.avgTime)
                          : "—"}
                      </span>
                    </div>
                    <div className="w-full flex items-center justify-center gap-3 p-6 rounded-[1.5rem] bg-app-bg border border-app-border border-dashed transition-all hover:bg-emerald-500/5 hover:border-emerald-500/20">
                      <Timer className="h-5 w-5 text-emerald-500" />
                      <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] text-center">
                        Tiempo promedio entre respuestas registradas.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna de Resultados Distribuidos */}
          <div className="grid grid-cols-1 gap-12">
            <SessionTopAreas
              top3={top3}
              bottom3={bottom3}
              categoriesMap={categoriesMap}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="app-card !p-8 shadow-xl hover:shadow-2xl transition-all group">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-app-bg rounded-xl border border-app-border group-hover:scale-110 transition-transform">
                    <CreditCard className="h-5 w-5 text-app-primary" />
                  </div>
                  <div>
                    <span className="app-label opacity-40">
                      ORIGEN DEL TEST
                    </span>
                    <p className="app-value !text-lg mt-1 font-black">
                      {session.paymentStatus === "PAID"
                        ? "PAGO INDIVIDUAL"
                        : "CANJE CON VOUCHER"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="app-card !p-8 shadow-xl hover:shadow-2xl transition-all group">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-app-bg rounded-xl border border-app-border group-hover:scale-110 transition-transform">
                    <KeyRound className="h-5 w-5 text-app-primary" />
                  </div>
                  <div>
                    <span className="app-label opacity-40">
                      ORIGEN DE ASIGNACION
                    </span>
                    <p className="app-value !text-lg mt-1 font-black leading-tight uppercase">
                      {session.institutionName || "PARTICULAR"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-16">
              <button
                onClick={() => setShowTechnicalData(!showTechnicalData)}
                className="flex w-full items-center justify-between p-10 rounded-[3rem] border border-app-border bg-app-surface shadow-xl hover:shadow-2xl hover:scale-[1.005] transition-all group active:scale-95"
              >
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-app-bg rounded-2xl border border-app-border">
                    <Activity className="h-6 w-6 text-app-text-muted group-hover:text-app-primary transition-colors" />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="app-value !text-xl mt-0">
                      Detalle por Categoria
                    </span>
                    <span className="app-label opacity-40 uppercase tracking-[0.4em]">
                      Puntaje por area evaluada
                    </span>
                  </div>
                </div>
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-app-bg border border-app-border group-hover:bg-app-primary group-hover:text-white transition-all">
                  {showTechnicalData ? (
                    <ChevronUp className="h-6 w-6" />
                  ) : (
                    <ChevronDown className="h-6 w-6" />
                  )}
                </div>
              </button>

              {showTechnicalData && (
                <div className="mt-12 animate-in duration-700">
                  <SessionCategoryChart
                    sortedResults={sortedResults}
                    top3={top3}
                    categoriesMap={categoriesMap}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
