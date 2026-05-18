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

// Lo exportamos por si alguna otra vista necesita consultar las traducciones de las siglas.
// Idealmente, en un futuro esto vendría de una base de datos o un archivo de traducciones (i18n).
export const HOLLAND_CATEGORY_LABELS: Record<string, string> = {
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
              <stop offset="5%" stopColor="var(--color-app-primary)" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="var(--color-app-primary)" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <PolarGrid stroke="var(--color-app-border)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "var(--color-app-text-muted)",
              fontSize: 10,
              fontWeight: 700,
            }}
          />
          <Tooltip
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
            strokeWidth={3}
            fill="url(#radarGradient)"
            fillOpacity={1}
            activeDot={{ r: 6, fill: "var(--color-app-primary)", stroke: "var(--color-app-surface)", strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}