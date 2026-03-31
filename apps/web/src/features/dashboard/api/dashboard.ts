import { API_URL, getAuthHeaders } from "./client";
import type { SessionApi } from "./sessions.api";

export * from "./sessions.api";
export * from "./vouchers.api";
export * from "./institutions.api";
export * from "./users.api";
export * from "./categories.api";

export async function fetchDashboardStats() {
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch API data");
    const responseData = await response.json();
    const sessions: SessionApi[] = responseData.data || [];

    const sumTimeMs = sessions.reduce(
      (acc, session) => acc + Number(session.totalTimeMs || 0),
      0
    );
    const averageTimeSeconds =
      sessions.length > 0 ? Math.floor(sumTimeMs / sessions.length / 1000) : 0;

    const categories: Record<string, { count: number; name: string }> = {};
    sessions.forEach((session) => {
      session.results?.forEach((result) => {
        if (!categories[result.categoryId]) {
          categories[result.categoryId] = {
            count: 0,
            name: `Categoría ${result.categoryId}`,
          };
        }
        categories[result.categoryId].count++;
      });
    });

    const resultsDistribution = Object.keys(categories)
      .map((categoryId) => ({
        categoryId,
        name: categories[categoryId].name,
        count: categories[categoryId].count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSessions: sessions.length || 0,
      completionRate: sessions.length > 0 ? 100 : 0,
      averageTimeSeconds,
      sessionsActivity: [{ date: "Hoy", count: sessions.length }],
      resultsDistribution:
        resultsDistribution.length > 0
          ? resultsDistribution
          : [
              { categoryId: "R", name: "Realista", count: 0 },
              { categoryId: "I", name: "Investigador", count: 0 },
              { categoryId: "A", name: "Artístico", count: 0 },
              { categoryId: "S", name: "Social", count: 0 },
              { categoryId: "E", name: "Emprendedor", count: 0 },
              { categoryId: "C", name: "Convencional", count: 0 },
            ],
    };
  } catch (error) {
    console.error("Backend offline, returning zeroes.", error);
    return {
      totalSessions: 0,
      completionRate: 0,
      averageTimeSeconds: 0,
      sessionsActivity: [],
      resultsDistribution: [],
    };
  }
}
