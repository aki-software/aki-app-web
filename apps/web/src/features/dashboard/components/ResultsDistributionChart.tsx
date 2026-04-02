import { CategoryDistributionData } from "@akit/contracts";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#6366F1",
  "#14B8A6",
  "#F43F5E",
  "#EAB308",
  "#0EA5E9",
  "#64748B",
];

interface ResultsDistributionChartProps {
  data: CategoryDistributionData[];
}

export function ResultsDistributionChart({
  data,
}: ResultsDistributionChartProps) {
  // Sort data by count descending for a better BarChart visualization
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="h-full w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
            stroke="var(--color-app-border)"
          />
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            width={88}
            tickFormatter={(value: string) =>
              value.length > 12 ? `${value.slice(0, 12)}...` : value
            }
            tick={{
              fontSize: 10,
              fill: "var(--color-app-text-muted)",
              fontWeight: 700,
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-app-surface)",
              borderRadius: "16px",
              border: "1px solid var(--color-app-border)",
              color: "var(--color-app-text-main)",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
              fontWeight: "900",
            }}
            itemStyle={{ color: "var(--color-app-primary)" }}
            cursor={{ fill: "var(--color-app-bg)", opacity: 0.4 }}
          />
          <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={14}>
            {sortedData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
