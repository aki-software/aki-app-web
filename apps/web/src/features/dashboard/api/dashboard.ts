import { DashboardStatsResponse } from "@akit/contracts";

/**
 * Servicio proxy que simula la respuesta que entregará el Backend.
 * Cuando el backend esté listo, reemplazaremos este mock por un simple fetch:
 * 
 * const response = await fetch('/api/sessions/dashboard');
 * return await response.json();
 */
export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  try {
    const response = await fetch('http://localhost:3000/sessions');
    if (!response.ok) throw new Error('Failed to fetch API data');
    const responseData = await response.json();
    const sessions = responseData.data || [];

    // Mapeo básico a los stats definidos
    // Este código transformará la data de la DB real en nuestra métrica mock temporalmente.
    
    // Calcula tiempos totales sumando todas las sesiones y calculando promedio en segundos
    const sumTimeMs = sessions.reduce((acc: number, s: { totalTimeMs?: string | number }) => acc + Number(s.totalTimeMs || 0), 0);
    const averageTimeSeconds = sessions.length > 0 ? Math.floor(sumTimeMs / sessions.length / 1000) : 0;

    // Calcular distribución de Holland results based on DB data
    const categories: Record<string, { count: number, name: string }> = {};
    sessions.forEach((s: { results?: { categoryId: string }[] }) => {
      if (s.results) {
        s.results.forEach((r) => {
          if (!categories[r.categoryId]) categories[r.categoryId] = { count: 0, name: `Categoría ${r.categoryId}` };
          categories[r.categoryId].count++;
        });
      }
    });

    const resultsDistribution = Object.keys(categories).map(k => ({
      categoryId: k,
      name: categories[k].name,
      count: categories[k].count,
    }));

    return {
      totalSessions: sessions.length || 0,
      completionRate: sessions.length > 0 ? 100 : 0, 
      averageTimeSeconds,
      sessionsActivity: [
        { date: "Reciente", count: sessions.length }
      ],
      resultsDistribution,
    };
  } catch(e) {
    console.error("Backend offline, returning zeroes.", e);
    return {
      totalSessions: 0,
      completionRate: 0,
      averageTimeSeconds: 0,
      sessionsActivity: [],
      resultsDistribution: [],
    };
  }
}

export interface SessionData {
  id: string;
  patientName: string;
  hollandCode: string;
  sessionDate: string | Date | number;
  totalTimeMs: number;
  results?: { categoryId: string; percentage: number }[];
}

export async function fetchSessionsList(): Promise<any[]> {
  try {
    const response = await fetch('http://localhost:3000/sessions');
    if (!response.ok) throw new Error('Failed to fetch API data');
    const responseData = await response.json();
    return responseData.data || [];
  } catch (error) {
    console.error('Error fetching sessions list:', error);
    return [];
  }
}

export async function fetchCategories(): Promise<any[]> {
  try {
    const response = await fetch('http://localhost:3000/categories');
    if (!response.ok) throw new Error('Failed to fetch categories');
    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function updateCategory(categoryId: string, data: { title: string; description: string }): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:3000/categories/${categoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return response.ok;
  } catch (error) {
    console.error('Error updating category:', error);
    return false;
  }
}
