import { Activity, CreditCard } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { StatCard } from "../../../components/molecules/StatCard";
import { useSessionDetailManager } from "../hooks/useSessionDetailManager";
import { HollandRadarChart } from "../components/session-detail/HollandRadarChart";
import { SessionTopAreas } from "../components/session-detail/SessionTopAreas";
import { SessionClinicalInsights } from "../components/session-detail/SessionClinicalInsights";
import { Clock, MousePointer2, Zap } from "lucide-react";
import { SessionDetailHeader } from "../components/session-detail/SessionDetailHeader";
import { TechnicalDataAccordion } from "../components/session-detail/TechnicalDataAccordion";
import { formatDate, formatDuration } from "../../../utils/date";
import { Spinner } from "../../../components/atoms/Spinner";

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isInstitutionView = location.pathname.includes('/institutions') || user?.role === 'INSTITUTION';

  const {
    session, 
    loading, 
    categoriesMap, 
    behaviorStats, 
    resultsRecord, 
    sortedResults, 
    top3, 
    bottom3, 
    handleDownloadPdf
  } = useSessionDetailManager(id);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <Spinner size="xl" className="border-app-primary" />
        <span className="app-label mt-4 opacity-50 tracking-[0.2em] animate-pulse">
          Generando Analítica Lux 3.0...
        </span>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-7xl pb-24 animate-in">
      
      {/* Componente Extraído: Header */}
      <SessionDetailHeader 
        patientName={session.patientName}
        sessionId={session.id}
        onBack={() => navigate(-1)}
        onDownloadPdf={handleDownloadPdf}
      />

      {/* Contenido Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        <div className="lg:col-span-12 xl:col-span-12 space-y-16">
          
          {/* Métricas Core (Destacadas) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Tiempo Total"
              value={formatDuration(session.totalTimeMs)}
              icon={<Clock className="h-5 w-5 text-app-primary" />}
            />
            <StatCard
              label="Velocidad Promedio"
              value={formatDuration(behaviorStats?.avgTime) === "0s" ? "< 1s" : formatDuration(behaviorStats?.avgTime)}
              icon={<Zap className="h-5 w-5 text-app-primary" />}
            />
            <StatCard
              label="Dudas y Retrocesos"
              value={behaviorStats?.undosCount || 0}
              icon={<MousePointer2 className="h-5 w-5 text-app-primary" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            
            {/* Radar Card Lux 3.0 */}
            <div className="app-card shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="app-value !text-2xl mt-0">Test Orient A.KI</h3>
                  <p className="app-label mt-3 opacity-60">DISTRIBUCIÓN DE INTERESES VOCACIONALES</p>
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
                  <span className="app-label mb-3 opacity-40">FECHA DE SESIÓN</span>
                  <span className="text-sm font-black text-app-text-main uppercase tracking-widest">
                    {formatDate(session.sessionDate)}
                  </span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="app-label mb-3 opacity-40">TIEMPO EJECUCIÓN</span>
                  <span className="text-sm font-black text-app-text-main uppercase tracking-widest">
                    {formatDuration(session.totalTimeMs)}
                  </span>
                </div>
              </div>
            </div>

            <SessionClinicalInsights 
              swipes={session.swipes}
              categoriesMap={categoriesMap}
            />
          </div>

          <div className="grid grid-cols-1 gap-12">
            <SessionTopAreas 
              top3={top3} 
              bottom3={bottom3} 
              categoriesMap={categoriesMap} 
            />

            {/* Bloque de Origen usando StatCard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <StatCard 
                label="ORIGEN DEL TEST"
                value={
                  session.paymentStatus === "VOUCHER" || session.voucherCode
                    ? `VOUCHER ${session.voucherCode ? `(${session.voucherCode})` : ''}`
                    : "PAGO INDIVIDUAL"
                }
                icon={<CreditCard className="h-5 w-5 text-app-primary" />}
                className="app-card !p-8 shadow-xl hover:shadow-2xl transition-all group"
              />
            </div>

            {/* Componente Extraído: Acordeón Técnico */}
            <TechnicalDataAccordion 
              sortedResults={sortedResults}
              top3={top3}
              categoriesMap={categoriesMap}
            />
          </div>
        </div>
      </div>
    </div>
  );
};