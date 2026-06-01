import { BrainCircuit, ActivitySquare, AlertCircle, HeartCrack, Info, Zap, BookOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryData } from "@akit/contracts";
import { BehavioralMethodologyPanel } from "./BehavioralMethodologyPanel";

interface SwipeData {
  cardId: string;
  categoryId: string;
  isLiked: boolean;
  timestamp?: string | Date;
}

interface SessionClinicalInsightsProps {
  swipes?: SwipeData[];
  categoriesMap: Record<string, CategoryData>;
}

export function SessionClinicalInsights({ swipes, categoriesMap }: SessionClinicalInsightsProps) {
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const insights = useMemo(() => {
    if (!swipes || swipes.length === 0) return null;

    const totalSwipes = swipes.length;
    const likes = swipes.filter((s) => s.isLiked).length;
    const likeRatio = likes / totalSwipes;

    const items = [];
    const normalIndicators: string[] = [];

    // 1. Índice de Selectividad (Sesgo de Respuesta)
    if (likeRatio > 0.75) {
      items.push({
        title: "Perfil Explorador",
        desc: `El paciente dio 'Me gusta' al ${Math.round(likeRatio * 100)}% de los estímulos visuales presentados (${likes} de ${totalSwipes}). Sugiere dificultad para acotar intereses o fuerte deseo de complacer.`,
        info: `Métrica: Se aceptaron ${likes} tarjetas de un total de ${totalSwipes}. Se considera "Explorador" cuando la aceptación supera el 75%.`,
        icon: <HeartCrack className="h-5 w-5 text-rose-500" />,
        color: "text-rose-500",
        bg: "bg-rose-500/10",
      });
    } else if (likeRatio < 0.25) {
      items.push({
        title: "Perfil Hiper-Selectivo",
        desc: `El paciente rechazó el ${Math.round((1 - likeRatio) * 100)}% de las opciones (${totalSwipes - likes} de ${totalSwipes}). Puede indicar apatía, desinterés general o nivel de exigencia irreal.`,
        info: `Métrica: Solo se aceptaron ${likes} tarjetas de un total de ${totalSwipes}. Se considera "Hiper-Selectivo" cuando el rechazo supera el 75%.`,
        icon: <ActivitySquare className="h-5 w-5 text-orange-500" />,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
      });
    } else {
      items.push({
        title: "Selectividad Saludable",
        desc: `La proporción de aceptación (${Math.round(likeRatio * 100)}%) y rechazo muestra una capacidad equilibrada para discriminar intereses.`,
        info: `Métrica: Aceptó ${likes} tarjetas y rechazó ${totalSwipes - likes}. El balance se encuentra dentro del parámetro saludable (25% al 75%).`,
        icon: <BrainCircuit className="h-5 w-5 text-emerald-500" />,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
      });
    }

    // Preparar estado final de tarjetas para Dudas y Polarización
    const cardSeenCount: Record<string, number> = {};
    const undosPerCategory: Record<string, number> = {};
    const likesPerCategory: Record<string, number> = {};
    const totalPerCategory: Record<string, number> = {};
    
    swipes.forEach((s) => {
      if (cardSeenCount[s.cardId]) {
        undosPerCategory[s.categoryId] = (undosPerCategory[s.categoryId] || 0) + 1;
      }
      cardSeenCount[s.cardId] = (cardSeenCount[s.cardId] || 0) + 1;
    });

    const finalSwipesState: Record<string, { categoryId: string, isLiked: boolean }> = {};
    swipes.forEach((s) => {
      finalSwipesState[s.cardId] = { categoryId: s.categoryId, isLiked: s.isLiked };
    });

    Object.values(finalSwipesState).forEach((state) => {
      totalPerCategory[state.categoryId] = (totalPerCategory[state.categoryId] || 0) + 1;
      if (state.isLiked) {
        likesPerCategory[state.categoryId] = (likesPerCategory[state.categoryId] || 0) + 1;
      }
    });

    // 2. Análisis de Dudas y Conflicto
    let maxUndosCat = "";
    let maxUndosCount = 0;
    const totalUndos = Object.values(undosPerCategory).reduce((a, b) => a + b, 0);

    Object.entries(undosPerCategory).forEach(([cat, count]) => {
      if (count > maxUndosCount) {
        maxUndosCount = count;
        maxUndosCat = cat;
      }
    });

    if (maxUndosCount > 0) {
      const catKey = maxUndosCat.toUpperCase();
      const catName = categoriesMap[catKey]?.title || maxUndosCat;
      // Bug 3 fix: determinar si fue exclusivo o predominante para no mentir al terapeuta
      const otherUndos = totalUndos - maxUndosCount;
      const isExclusive = otherUndos === 0;
      const adverb = isExclusive ? "exclusivamente" : "principalmente";

      items.push({
        title: "Foco de Conflicto",
        desc: `La mayor cantidad de dudas y retrocesos ocurrieron en el área de ${catName}. Excelente punto para explorar en sesión.`,
        info: `Métrica: El paciente presionó "Deshacer" ${adverb} en la categoría ${catName} (${maxUndosCount} de ${totalUndos} retrocesos totales), evidenciando ambivalencia vocacional en este ámbito.`,
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
      });
    } else {
      normalIndicators.push("Foco de Conflicto (sin retrocesos significativos)");
    }

    // 3. Consolidación (Polarización)
    const consolidaciones: string[] = [];
    const rechazos: string[] = [];
    
    Object.keys(totalPerCategory).forEach(cat => {
      const total = totalPerCategory[cat];
      const likesCat = likesPerCategory[cat] || 0;
      if (total >= 4) { // Requiere al menos 4 tarjetas para considerar un patrón
        const catName = categoriesMap[cat.toUpperCase()]?.title || cat;
        if (likesCat === total) consolidaciones.push(catName);
        if (likesCat === 0) rechazos.push(catName);
      }
    });

    if (consolidaciones.length > 0 || rechazos.length > 0) {
      let desc = "";
      if (consolidaciones.length > 0) desc += `Aceptación total (100%) en ${consolidaciones.join(", ")}. `;
      if (rechazos.length > 0) desc += `Rechazo total (0%) en ${rechazos.join(", ")}.`;
      
      items.push({
        title: "Intereses Polarizados",
        desc: desc.trim(),
        info: `Métrica: Basado en categorías donde vio al menos 4 tarjetas. Aceptación total (100% de likes) o Rechazo total (0% de likes) en áreas específicas indican señales muy sólidas y confiables.`,
        icon: <Zap className="h-5 w-5 text-purple-500" />,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
      });
    } else {
      normalIndicators.push("Distribución de Intereses (sin polarización extrema)");
    }

    // 4. Curva de fatiga
    // Bug 2 fix: ordenar cronológicamente antes de calcular cuartos
    const validTimestamps = swipes
      .filter(s => s.timestamp)
      .map(s => new Date(s.timestamp!).getTime())
      .sort((a, b) => a - b);

    if (validTimestamps.length > 20) {
      const firstQuarter = validTimestamps.slice(0, Math.floor(validTimestamps.length / 4));
      const lastQuarter = validTimestamps.slice(-Math.floor(validTimestamps.length / 4));
      
      const calcAvgDiff = (arr: number[]) => {
        let sum = 0;
        let count = 0;
        for (let i = 1; i < arr.length; i++) {
          const diff = arr[i] - arr[i - 1];
          if (diff > 0 && diff < 100000) { sum += diff; count++; }
        }
        return count > 0 ? sum / count : 0;
      };

      const firstAvg = calcAvgDiff(firstQuarter);
      const lastAvg = calcAvgDiff(lastQuarter);

      if (firstAvg > 1500 && lastAvg > 0 && lastAvg < (firstAvg * 0.5)) {
        items.push({
          title: "Impulsividad o Fatiga Final",
          desc: `El ritmo promedio inicial (${(firstAvg / 1000).toFixed(1)}s por imagen) bajó drásticamente al final del test (${(lastAvg / 1000).toFixed(1)}s por imagen).`,
          info: `Métrica: La velocidad del último 25% del test fue de ${(lastAvg / 1000).toFixed(1)}s, menos de la mitad del tiempo de lectura que mantenía al inicio (${(firstAvg / 1000).toFixed(1)}s). Puede indicar cansancio o apuro al final.`,
          icon: <ActivitySquare className="h-5 w-5 text-orange-500" />,
          color: "text-orange-500",
          bg: "bg-orange-500/10",
        });
      } else {
        normalIndicators.push("Ritmo de Ejecución (sin fatiga o impulsividad detectada)");
      }
    } else {
      normalIndicators.push("Ritmo de Ejecución (muestra insuficiente para análisis de fatiga)");
    }

    return { items, normalIndicators };
  }, [swipes, categoriesMap]);

  if (!insights || insights.items.length === 0) return null;

  const { items, normalIndicators } = insights;

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
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-500/60 mb-3">
                ✓ Dentro de parámetros normales
              </p>
              <ul className="space-y-1.5">
                {normalIndicators.map((label, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-medium text-app-text-muted/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/40 flex-shrink-0" />
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
