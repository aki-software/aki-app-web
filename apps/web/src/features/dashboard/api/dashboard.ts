import { DashboardStatsResponse } from "@akit/contracts";

/**
 * Servicio proxy que simula la respuesta que entregará el Backend.
 * Cuando el backend esté listo, reemplazaremos este mock por un simple fetch:
 * 
 * const response = await fetch('/api/sessions/dashboard');
 * return await response.json();
 */
export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  // Simulando latencia de red
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    totalSessions: 1248,
    completionRate: 89,
    averageTimeSeconds: 252, // 4m 12s
    sessionsActivity: [
      { date: "Lun", count: 40 },
      { date: "Mar", count: 30 },
      { date: "Mié", count: 20 },
      { date: "Jue", count: 27 },
      { date: "Vie", count: 18 },
      { date: "Sáb", count: 23 },
      { date: "Dom", count: 34 },
    ],
    resultsDistribution: [
      { categoryId: "ingenieria", name: "Ingeniería", count: 400 },
      { categoryId: "medicina", name: "Medicina", count: 300 },
      { categoryId: "arte_diseno", name: "Arte y Diseño", count: 300 },
      { categoryId: "derecho", name: "Derecho", count: 200 },
    ],
  };
}
