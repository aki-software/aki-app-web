import { Activity, CreditCard, ThumbsDown, ThumbsUp, ArrowUpDown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { StatCard } from "../../../components/atoms/StatCard";
import { useSessionDetailManager } from "../hooks/useSessionDetailManager";
import { HollandRadarChart } from "../components/session-detail/HollandRadarChart";
import { SessionTopAreas } from "../components/session-detail/SessionTopAreas";
import { SessionClinicalInsights } from "../components/session-detail/SessionClinicalInsights";
import { Clock, MousePointer2, Zap } from "lucide-react";
import { SessionDetailHeader } from "../components/session-detail/SessionDetailHeader";
import { TechnicalDataAccordion } from "../components/session-detail/TechnicalDataAccordion";
import { ResponseTimeHistogram } from "../components/session-detail/ResponseTimeHistogram";
import { formatDate, formatDuration } from "../../../utils/date";
import { Spinner } from "../../../components/atoms/Spinner";

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const location = useLocation();
  // const { user } = useAuth();
  // const isInstitutionView = location.pathname.includes('/institutions') || user?.role === 'INSTITUTION';

  const {
    session, 
    loading, 
    categoriesMap, 
    metrics,
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

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-[11px] font-semibold text-app-text-muted/50 uppercase tracking-[0.15em]">
        <button onClick={() => navigate('/dashboard/results')} className="hover:text-app-primary transition-colors">Dashboard</button>
        <span className="opacity-30">/</span>
        <button onClick={() => navigate('/dashboard/results')} className="hover:text-app-primary transition-colors">Resultados</button>
        <span className="opacity-30">/</span>
        <span className="text-app-text-muted/80 truncate max-w-[200px]">{session.patientName}</span>
      </div>

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
              metrics={metrics}
            />
          </div>

          {/* Histograma de tiempo de respuesta */}
          {metrics?.responseTimeHistogram && metrics.responseTimeHistogram.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <ResponseTimeHistogram data={metrics.responseTimeHistogram} />

              {/* Reverted Direction */}
              {metrics.revertedDirection && (
                <div className="app-card shadow-2xl h-full flex flex-col">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="rounded-2xl bg-app-bg p-4 border border-app-border shadow-md">
                      <ArrowUpDown className="h-8 w-8 text-app-primary" />
                    </div>
                    <div>
                      <h4 className="app-value !text-2xl mt-0">Dirección de Cambios</h4>
                      <p className="app-label mt-2">Retrocesos por tipo</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 flex-1">
                    {/* Disliked → Liked */}
                    <div className="rounded-2xl bg-status-success/5 border border-status-success/20 p-6 flex flex-col items-center text-center">
                      <ThumbsUp className="h-8 w-8 text-status-success mb-3" />
                      <span className="text-3xl font-black text-status-success">
                        {metrics.revertedDirection.dislikedToLiked}
                      </span>
                      <span className="text-xs font-medium text-app-text-muted mt-2">
                        Rechazo → Aceptación
                      </span>
                      {(() => {
                        if (!metrics.revertedDirection.details) return null;
                        const filtered = metrics.revertedDirection.details.filter(d => d.type === 'dislikedToLiked');
                        if (filtered.length === 0) return null;
                        
                        const counts = new Map<string, number>();
                        filtered.forEach(d => counts.set(d.categoryId, (counts.get(d.categoryId) || 0) + 1));
                        
                        return (
                          <div className="mt-3 flex flex-wrap gap-1.5 justify-center w-full">
                            {Array.from(counts.entries()).map(([categoryId, count]) => (
                              <span key={categoryId} className="text-[10px] font-bold uppercase tracking-wide text-status-success bg-status-success/10 border border-status-success/20 rounded-md px-2 py-1">
                                {categoriesMap[categoryId.toUpperCase()]?.title ?? categoryId} {count > 1 ? `(${count})` : ''}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Liked → Disliked */}
                    <div className="rounded-2xl bg-status-error/5 border border-status-error/20 p-6 flex flex-col items-center text-center">
                      <ThumbsDown className="h-8 w-8 text-status-error mb-3" />
                      <span className="text-3xl font-black text-status-error">
                        {metrics.revertedDirection.likedToDisliked}
                      </span>
                      <span className="text-xs font-medium text-app-text-muted mt-2">
                        Aceptación → Rechazo
                      </span>
                      {(() => {
                        if (!metrics.revertedDirection.details) return null;
                        const filtered = metrics.revertedDirection.details.filter(d => d.type === 'likedToDisliked');
                        if (filtered.length === 0) return null;
                        
                        const counts = new Map<string, number>();
                        filtered.forEach(d => counts.set(d.categoryId, (counts.get(d.categoryId) || 0) + 1));
                        
                        return (
                          <div className="mt-3 flex flex-wrap gap-1.5 justify-center w-full">
                            {Array.from(counts.entries()).map(([categoryId, count]) => (
                              <span key={categoryId} className="text-[10px] font-bold uppercase tracking-wide text-status-error bg-status-error/10 border border-status-error/20 rounded-md px-2 py-1">
                                {categoriesMap[categoryId.toUpperCase()]?.title ?? categoryId} {count > 1 ? `(${count})` : ''}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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