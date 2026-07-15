import { PieChart } from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SelectivityDonutProps {
  selective: number;
  balanced: number;
  exploratory: number;
  totalSessions: number;
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  payload?: Record<string, unknown>;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div
      className="rounded-2xl px-4 py-2 shadow-lg text-xs font-bold"
      style={{
        backgroundColor: "var(--color-app-surface)",
        border: "1px solid var(--color-app-border)",
        color: "var(--color-app-text-main)",
      }}
    >
      <p>{entry.name}: {entry.value} ({String(entry.payload?.percent ?? "")})</p>
    </div>
  );
}

export function SelectivityDonut({
  selective,
  balanced,
  exploratory,
  totalSessions,
}: SelectivityDonutProps) {
  const total = selective + balanced + exploratory;

  if (total === 0) {
    return (
      <div className="app-card !p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-app-bg p-2.5 border border-app-border">
            <PieChart className="h-5 w-5 text-app-primary" />
          </div>
          <p className="text-sm font-bold text-app-text-main">Distribución de Selectividad</p>
        </div>
        <p className="text-xs font-medium text-app-text-muted/60">Sin datos suficientes</p>
      </div>
    );
  }

  const chartData = [
    { name: "Selectivo", value: selective, color: "var(--color-status-error)" },
    { name: "Balanceado", value: balanced, color: "var(--color-status-success)" },
    { name: "Explorador", value: exploratory, color: "var(--color-status-warning)" },
  ];

  return (
    <div className="app-card !p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl bg-app-bg p-2.5 border border-app-border">
          <PieChart className="h-5 w-5 text-app-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-app-text-main">Selectividad</p>
          <p className="text-[10px] font-medium text-app-text-muted/60">
            {totalSessions} sesiones elegibles
          </p>
        </div>
      </div>

      {/* Donut with center label */}
      <div className="relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </RechartsPieChart>
        </ResponsiveContainer>
        {/* Center label overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-black text-app-text-main">{totalSessions}</p>
            <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider">
              Total
            </p>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="h-2 w-2 rounded-full bg-status-error" />
            <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider">
              Selectivo
            </span>
          </div>
          <p className="text-lg font-black text-app-text-main">{selective}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="h-2 w-2 rounded-full bg-status-success" />
            <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider">
              Balanceado
            </span>
          </div>
          <p className="text-lg font-black text-app-text-main">{balanced}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="h-2 w-2 rounded-full bg-status-warning" />
            <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider">
              Explorador
            </span>
          </div>
          <p className="text-lg font-black text-app-text-main">{exploratory}</p>
        </div>
      </div>
    </div>
  );
}
