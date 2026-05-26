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

  // Comportamiento: se toman las métricas pre-calculadas por el backend
  const behaviorStats = useMemo(() => {
    const m = session?.metrics;
    if (!m) return null;
    return {
      undosCount: m.revertedMatches ?? 0,
      avgTime: m.avgTimeBetweenSwipesMs > 0 ? m.avgTimeBetweenSwipesMs : null,
      reliabilityLevel: m.reliabilityLevel ?? "N/A",
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
      a.download = `informe-${session.patientName.replace(/\s+/g, '-')}-${session.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('No se pudo descargar el informe. Intente nuevamente.');
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