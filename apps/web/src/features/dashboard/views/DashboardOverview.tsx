import { useEffect, useState } from "react";
import { Users, CheckCircle, Clock } from "lucide-react";
import { DashboardStatsResponse } from "@akit/contracts";
import { StatCard } from "../components/StatCard";
import { SessionsChart } from "../components/SessionsChart";
import { ResultsDistributionChart } from "../components/ResultsDistributionChart";
import { fetchDashboardStats } from "../api/dashboard";

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar dashboard: ", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      </div>
    );
  }

  if (!stats) return <div>Error loading stats</div>;

  const minutes = Math.floor(stats.averageTimeSeconds / 60);
  const seconds = stats.averageTimeSeconds % 60;
  const averageTimeStr = `${minutes}m ${seconds}s`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Sesiones"
          value={stats.totalSessions.toLocaleString("es-AR")}
          icon={Users}
          trend={{ value: stats.totalSessions >= 1 ? 5.2 : 0, isPositive: true }}
        />
        <StatCard
          title="Completados"
          value={`${stats.completionRate}%`}
          icon={CheckCircle}
          trend={{ value: 1.8, isPositive: true }}
        />
        <StatCard
          title="Tiempo Promedio"
          value={averageTimeStr}
          icon={Clock}
          trend={{ value: 3.4, isPositive: false }} 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SessionsChart data={stats.sessionsActivity} />
        <ResultsDistributionChart data={stats.resultsDistribution} />
      </div>
    </div>
  );
}
