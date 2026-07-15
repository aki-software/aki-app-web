import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { HOLLAND_CATEGORY_LABELS } from "../../constants/holland";

interface HollandRadarChartProps {
  results: Record<string, number>;
}

interface TooltipPayloadEntry {
  value?: number;
  payload?: { subject?: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl px-4 py-2 shadow-lg text-xs font-bold"
      style={{
        backgroundColor: "var(--color-app-surface)",
        border: "1px solid var(--color-app-border)",
        color: "var(--color-app-text-main)",
      }}
    >
      <p className="mb-0.5">{payload[0].payload?.subject}</p>
      <p style={{ color: "var(--color-app-primary)" }}>
        Afinidad: {payload[0].value}%
      </p>
    </div>
  );
}

export function HollandRadarChart({ results }: HollandRadarChartProps) {
  const chartData = useMemo(() => {
    return Object.entries(HOLLAND_CATEGORY_LABELS).map(([id, label]) => {
      return {
        subject: label,
        A: results[id.toUpperCase()] ?? 0,
        fullMark: 100,
      };
    });
  }, [results]);

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-app-primary)" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="var(--color-app-primary)" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <PolarGrid
            stroke="var(--color-app-border)"
            strokeDasharray="4 4"
            strokeWidth={1}
            opacity={0.6}
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "var(--color-app-text-muted)",
              fontSize: 10,
              fontWeight: 700,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{
              fill: "var(--color-app-text-muted)",
              fontSize: 9,
              fontWeight: 600,
            }}
            tickCount={5}
            axisLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            contentStyle={{
              backgroundColor: "var(--color-app-surface)",
              border: "1px solid var(--color-app-border)",
              borderRadius: "16px",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
              color: "var(--color-app-text-main)",
              fontWeight: 800,
            }}
            itemStyle={{ color: "var(--color-app-primary)" }}
          />
          <Radar
            name="Afinidad"
            dataKey="A"
            stroke="var(--color-app-primary)"
            strokeWidth={2.5}
            fill="url(#radarGradient)"
            fillOpacity={1}
            isAnimationActive={true}
            activeDot={{ r: 6, fill: "var(--color-app-primary)", stroke: "var(--color-app-surface)", strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
