import { Zap } from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";

interface RushGaugeProps {
  rushRate: number | null;
  totalSessions: number;
}

export function RushGauge({ rushRate, totalSessions }: RushGaugeProps) {
  if (rushRate == null || totalSessions === 0) {
    return (
      <div className="app-card !p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-app-bg p-2.5 border border-app-border">
            <Zap className="h-5 w-5 text-status-warning" />
          </div>
          <p className="text-sm font-bold text-app-text-main">Respuesta Acelerada</p>
        </div>
        <p className="text-xs font-medium text-app-text-muted/60">Sin datos suficientes</p>
      </div>
    );
  }

  const pct = Math.round(rushRate * 100);
  const clampedPct = Math.min(pct, 100);

  const barColor =
    pct > 20 ? "var(--color-status-error)" : pct > 10 ? "var(--color-status-warning)" : "var(--color-status-success)";

  const textColor =
    pct > 20 ? "text-status-error" : pct > 10 ? "text-status-warning" : "text-status-success";

  const chartData = [
    {
      name: "Rush",
      value: clampedPct,
      fill: barColor,
    },
  ];

  return (
    <div className="app-card !p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl bg-app-bg p-2.5 border border-app-border">
          <Zap className="h-5 w-5 text-yellow-500" />
        </div>
        <p className="text-sm font-bold text-app-text-main">Respuesta Acelerada</p>
      </div>

      <div className="relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={160}>
          <RadialBarChart
            cx="50%"
            cy="100%"
            innerRadius="60%"
            outerRadius="100%"
            barSize={16}
            data={chartData}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              background={{ fill: "var(--color-app-bg)" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center percentage overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className={`text-3xl font-black ${textColor}`}>{pct}%</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-1">
        <span className="text-[10px] font-medium text-app-text-muted/60">
          {totalSessions} sesiones
        </span>
      </div>
    </div>
  );
}
