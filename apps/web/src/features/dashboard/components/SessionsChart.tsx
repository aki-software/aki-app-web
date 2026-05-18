import { SessionActivityData } from "@akit/contracts";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface SessionsChartProps {
  data: SessionActivityData[];
}

export function SessionsChart({ data }: SessionsChartProps) {
  return (
    <div className="h-full w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
        >
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-app-primary)" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="var(--color-app-primary)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-app-border)"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--color-app-text-muted)",
              fontSize: 10,
              fontWeight: 700,
            }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--color-app-text-muted)",
              fontSize: 10,
              fontWeight: 700,
            }}
            width={28}
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
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--color-app-primary)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCount)"
            activeDot={{
              r: 8,
              strokeWidth: 0,
              fill: "var(--color-app-primary)",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
