import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchSessionDetail, downloadSessionPdf, type SessionDetailData } from "../api/dashboard";
import { useCategories } from "./useCategories";

export const useSessionDetailManager = (id?: string) => {
  const [session, setSession] = useState<SessionDetailData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const { categoriesMap, loading: categoriesLoading } = useCategories();

  useEffect(() => {
    if (!id) return;
    setLoadingSession(true);
    fetchSessionDetail(id).then((data) => {
      setSession(data);
      setLoadingSession(false);
    });
  }, [id]);

  // Cálculos de comportamiento
  const behaviorStats = useMemo(() => {
    if (!session?.swipes || session.swipes.length === 0) return null;
    const swipes = session.swipes;
    const cardIds = swipes.map((s) => s.cardId);
    const uniqueCards = new Set(cardIds);
    const undosCount = cardIds.length - uniqueCards.size;
    
    const durations: number[] = [];
    for (let i = 1; i < swipes.length; i++) {
      if (swipes[i].timestamp && swipes[i - 1].timestamp) {
        const diff = new Date(swipes[i].timestamp!).getTime() - new Date(swipes[i - 1].timestamp!).getTime();
        if (diff > 0 && diff < 300000) durations.push(diff);
      }
    }
    
    return {
      undosCount,
      avgTime: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      reliabilityLevel: undosCount > 10 ? "Baja" : undosCount > 5 ? "Variable" : "Muy Alta",
    };
  }, [session]);

  // Cálculos de resultados
  const resultsRecord = useMemo(() => {
    const record: Record<string, number> = {};
    session?.results?.forEach((r) => { record[r.categoryId.toUpperCase()] = r.percentage; });
    return record;
  }, [session]);

  // Sorting de resultados
  const { sortedResults, top3, bottom3 } = useMemo(() => {
    const allCategories = Object.keys(categoriesMap).filter((k) => k !== "...");
    const sorted = [...allCategories]
      .map((cat) => ({ cat, pct: resultsRecord[cat] ?? 0 }))
      .sort((a, b) => b.pct - a.pct);
      
    return {
      sortedResults: sorted,
      top3: sorted.slice(0, 3),
      bottom3: sorted.slice(-3).reverse()
    };
  }, [categoriesMap, resultsRecord]);

  // Descarga del PDF
  const handleDownloadPdf = useCallback(async () => {
    if (!session) return;
    try {
      const blob = await downloadSessionPdf(session.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${session.id}.html`; 
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  }, [session]);

  const loading = loadingSession || categoriesLoading;

  return {
    session,
    loading,
    categoriesMap,
    behaviorStats,
    resultsRecord,
    sortedResults,
    top3,
    bottom3,
    handleDownloadPdf
  };
};