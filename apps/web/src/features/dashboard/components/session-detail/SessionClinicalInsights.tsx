import { BrainCircuit, ActivitySquare, AlertCircle, HeartCrack, Info, Zap, BookOpen, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { SessionMetrics } from "@akit/contracts";
import { BehavioralMethodologyPanel } from "./BehavioralMethodologyPanel";

interface SessionClinicalInsightsProps {
  metrics?: SessionMetrics | null;
}

export function SessionClinicalInsights({ metrics }: SessionClinicalInsightsProps) {
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // Los insights vienen pre-calculados por el backend desde SessionMetricsService.
  // Este componente solo presenta los datos — no hay cómputo client-side.
  const items: Array<{
    title: string;
    desc: string;
    info: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
  }> = [];

  const normalIndicators: string[] = [];

  if (metrics) {
    // 1. Selectividad
    const likeRatio = metrics.likeRatio != null ? Number(metrics.likeRatio) : null;
    const totalSwipes = metrics.totalSwipes;
    const likes = likeRatio != null && totalSwipes > 0 ? Math.round(likeRatio * totalSwipes) : 0;

    if (metrics.selectivityLevel === "EXPLORATORY") {
      items.push({
        title: "Perfil Explorador",
        desc: `El paciente dio 'Me gusta' al ${Math.round((likeRatio ?? 0) * 100)}% de los estímulos visuales presentados (${likes} de ${totalSwipes}). Sugiere dificultad para acotar intereses o fuerte deseo de complacer.`,
        info: `Métrica del backend: likeRatio=${likeRatio?.toFixed(2)}, selectivityLevel=EXPLORATORY. Se considera "Explorador" cuando la aceptación supera el 75%.`,
        icon: <HeartCrack className="h-5 w-5 text-status-error" />,
        color: "text-status-error",
        bg: "bg-status-error/10",
      });
    } else if (metrics.selectivityLevel === "SELECTIVE") {
      items.push({
        title: "Perfil Hiper-Selectivo",
        desc: `El paciente rechazó el ${Math.round((1 - (likeRatio ?? 0)) * 100)}% de las opciones. Puede indicar apatía, desinterés general o nivel de exigencia irreal.`,
        info: `Métrica del backend: likeRatio=${likeRatio?.toFixed(2)}, selectivityLevel=SELECTIVE. Se considera "Hiper-Selectivo" cuando el rechazo supera el 75%.`,
        icon: <ActivitySquare className="h-5 w-5 text-orange-500" />,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
      });
    } else if (metrics.selectivityLevel === "BALANCED") {
      items.push({
        title: "Selectividad Saludable",
        desc: `La proporción de aceptación (${Math.round((likeRatio ?? 0) * 100)}%) y rechazo muestra una capacidad equilibrada para discriminar intereses.`,
        info: `Métrica del backend: likeRatio=${likeRatio?.toFixed(2)}, selectivityLevel=BALANCED. El balance se encuentra dentro del parámetro saludable (25% al 75%).`,
        icon: <BrainCircuit className="h-5 w-5 text-status-success" />,
        color: "text-status-success",
        bg: "bg-status-success/10",
      });
    }

    // 2. Fatiga / Impulsividad — detectada por el backend
    if (metrics.fatigueDetected) {
      const firstHalfRate = metrics.firstHalfLikeRate;
      const lastHalfRate = metrics.lastHalfLikeRate;
      items.push({
        title: "Impulsividad o Fatiga Final",
        desc: `El ritmo de respuesta se redujo significativamente hacia el final del test, lo que puede indicar cansancio o apuro.`,
        info: `Métrica del backend: fatigueDetected=true, firstHalfLikeRate=${firstHalfRate ?? "N/A"}, lastHalfLikeRate=${lastHalfRate ?? "N/A"}. Se activa cuando la velocidad del último tramo es menos de la mitad del primero.`,
        icon: <ActivitySquare className="h-5 w-5 text-orange-500" />,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
      });
    } else {
      normalIndicators.push("Ritmo de Ejecución (sin fatiga o impulsividad detectada)");
    }

    // 3. Dudas (revertedMatches del backend)
    const undosCount = metrics.revertedMatches;
    if (undosCount > 0) {
      items.push({
        title: "Foco de Conflicto",
        desc: `El paciente presionó "Deshacer" en ${undosCount} ocasiones, evidenciando ambivalencia durante la evaluación. Esto no es un problema — es una señal valiosa para explorar en sesión.`,
        info: `Métrica del backend: revertedMatches=${undosCount}. Cada retroceso representa un cambio de decisión y es un marcador de conflicto vocacional.`,
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
      });
    } else {
      normalIndicators.push("Foco de Conflicto (sin retrocesos significativos)");
    }

    // 4. Rush — detectado por el backend
    if (metrics.rushDetected) {
      items.push({
        title: "Respuesta Acelerada",
        desc: `El paciente respondió de forma inusualmente rápida en ciertos tramos, lo que puede indicar descuido o falta de reflexión.`,
        info: `Métrica del backend: rushDetected=true. Se activa cuando el tiempo entre swipes cae por debajo de un umbral mínimo que sugiere respuesta sin lectura.`,
        icon: <Zap className="h-5 w-5 text-yellow-500" />,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
      });
    } else {
      normalIndicators.push("Ritmo de Respuesta (sin aceleración anómala)");
    }
  }

  // Metrics unavailable — mostrar mensaje informativo
  if (!metrics) {
    return (
      <div className="app-card shadow-2xl h-full flex flex-col">
        <div className="flex items-center gap-6 mb-8">
          <div className="rounded-2xl bg-app-bg p-4 border border-app-border shadow-md">
            <BrainCircuit className="h-8 w-8 text-app-primary" />
          </div>
          <div className="flex-1">
            <h4 className="app-value !text-2xl mt-0">Análisis Conductual</h4>
            <p className="app-label mt-2">Patrones de comportamiento en sesión</p>
          </div>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-bg px-6 py-8 text-center">
          <p className="text-sm font-medium text-app-text-muted">
            Las métricas conductuales se están procesando. Estarán disponibles en breve.
          </p>
        </div>
      </div>
    );
  }

  // Banner de baja confiabilidad
  const reliabilityBanner = metrics.reliabilityLevel === "Baja" ? (
    <div className="rounded-2xl border border-status-error/20 bg-status-error/5 px-5 py-4 flex items-start gap-4">
      <ShieldAlert className="h-6 w-6 text-status-error flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-status-error uppercase tracking-wider mb-1">Confiabilidad Baja</p>
        <p className="text-xs text-app-text-muted leading-relaxed">
          El índice de fiabilidad de esta sesión es bajo. Los resultados deben interpretarse con precaución.
          Considere factores como fatiga, apuro o falta de atención durante el test.
        </p>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="app-card shadow-2xl h-full flex flex-col">
        <div className="flex items-center gap-6 mb-8">
          <div className="rounded-2xl bg-app-bg p-4 border border-app-border shadow-md">
            <BrainCircuit className="h-8 w-8 text-app-primary" />
          </div>
          <div className="flex-1">
            <h4 className="app-value !text-2xl mt-0">Análisis Conductual</h4>
            <p className="app-label mt-2">
              Patrones de comportamiento en sesión
            </p>
          </div>
          <button
            onClick={() => setMethodologyOpen(true)}
            title="¿Cómo se calcula esto?"
            className="flex items-center gap-2 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-xs font-semibold text-app-text-muted hover:border-app-primary/40 hover:text-app-primary transition-all"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">¿Cómo funciona?</span>
          </button>
        </div>

        {/* Banner de baja confiabilidad */}
        {reliabilityBanner}

        <div className="flex flex-col gap-6 flex-1">
          {items.map((insight, idx) => (
            <div key={idx} className="flex gap-4 p-5 rounded-2xl bg-app-bg border border-app-border items-start transition-all hover:shadow-md">
              <div className={`p-3 rounded-xl ${insight.bg} flex-shrink-0 mt-1`}>
                {insight.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h5 className={`text-sm font-black uppercase tracking-wider ${insight.color}`}>
                    {insight.title}
                  </h5>
                  {insight.info && (
                    <div className="group relative flex items-center">
                      <Info className="h-5 w-5 text-app-text-muted hover:text-app-primary cursor-help transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 p-5 bg-app-text-main text-app-bg text-sm font-medium rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-20 text-left leading-relaxed">
                        {insight.info}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-8 border-transparent border-t-app-text-main" />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-app-text-muted leading-relaxed">
                  {insight.desc}
                </p>
              </div>
            </div>
          ))}

          {/* Descarte Positivo: indicadores dentro del rango normal */}
          {normalIndicators.length > 0 && (
            <div className="rounded-2xl border border-status-success/15 bg-status-success/5 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-status-success/60 mb-3">
                ✓ Dentro de parámetros normales
              </p>
              <ul className="space-y-1.5">
                {normalIndicators.map((label, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-medium text-app-text-muted/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-success/40 flex-shrink-0" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <BehavioralMethodologyPanel
        open={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />
    </>
  );
}
