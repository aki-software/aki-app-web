import { useMemo } from "react";
import {
    PolarAngleAxis,
    PolarGrid,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

interface HollandRadarChartProps {
  results: Record<string, number>;
}

const CATEGORY_LABELS: Record<string, string> = {
  ART: "Artístico",
  HUM: "Humano",
  SERV: "Servicios",
  PROT: "Prot",
  PHYS: "Físico",
  IND: "Industrial",
  MECH: "Mecánica",
  NAT: "Natural",
  LEAD: "Líder",
  SCI: "Ciencia",
  SAL: "Ventas",
  BUS: "Negocios",
};

export function HollandRadarChart({ results }: HollandRadarChartProps) {
  const chartData = useMemo(() => {
    return Object.entries(CATEGORY_LABELS).map(([id, label]) => {
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
          {/* Usamos variables CSS para que Recharts las tome del tema activo */}
          <PolarGrid stroke="var(--color-app-border)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "var(--color-app-text-muted)",
              fontSize: 10,
              fontWeight: 600,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-app-surface)",
              border: "1px solid var(--color-app-border)",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
              color: "var(--color-app-text-main)",
            }}
            itemStyle={{ color: "var(--color-app-primary)" }}
          />
          <Radar
            name="Afinidad"
            dataKey="A"
            stroke="var(--color-app-primary)"
            fill="var(--color-app-primary)"
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
