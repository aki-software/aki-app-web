import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HistogramBucket {
  bucket: number;
  count: number;
}

interface ResponseTimeHistogramProps {
  data: HistogramBucket[] | null | undefined;
}

const BUCKET_LABELS = [
  "<1s", "1-2s", "2-3s", "3-4s", "4-5s",
  "5-6s", "6-7s", "7-8s", "8-9s", "9-10s+",
];

interface TooltipPayloadEntry {
  value?: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
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
      <p className="text-app-text-muted font-medium mb-0.5">{label}</p>
      <p style={{ color: "var(--color-app-primary)" }}>
        {payload[0].value} respuestas
      </p>
    </div>
  );
}

export function ResponseTimeHistogram({ data }: ResponseTimeHistogramProps) {
  if (!data || data.length === 0) {
    return (
      <div className="app-card shadow-2xl h-full flex flex-col">
        <div className="flex items-center gap-6 mb-8">
          <div className="rounded-2xl bg-app-bg p-4 border border-app-border shadow-md">
            <BarChart3 className="h-8 w-8 text-app-primary" />
          </div>
          <div>
            <h4 className="app-value !text-2xl mt-0">Tiempo de Respuesta</h4>
            <p className="app-label mt-2">Distribución por intervalo</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-2xl bg-app-bg border border-app-border p-8">
          <p className="text-sm font-medium text-app-text-muted/60">
            Sin datos suficientes
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.map((bucket, idx) => ({
    label: BUCKET_LABELS[idx] ?? `${bucket.bucket}s`,
    count: bucket.count,
  }));

  const maxCount = Math.max(...data.map((b) => b.count), 1);

  return (
    <div className="app-card shadow-2xl h-full flex flex-col">
      <div className="flex items-center gap-6 mb-8">
        <div className="rounded-2xl bg-app-bg p-4 border border-app-border shadow-md">
          <BarChart3 className="h-8 w-8 text-app-primary" />
        </div>
        <div>
          <h4 className="app-value !text-2xl mt-0">Tiempo de Respuesta</h4>
          <p className="app-label mt-2">Distribución por intervalo</p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="histogramGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-app-primary)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--color-app-primary)" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-app-border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: "var(--color-app-text-muted)",
                fontSize: 10,
                fontWeight: 700,
              }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={50}
            />
            <YAxis
              hide={false}
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "var(--color-app-text-muted)",
                fontSize: 10,
                fontWeight: 600,
              }}
              domain={[0, maxCount]}
              allowDecimals={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-app-bg)" }} />
            <Bar
              dataKey="count"
              fill="url(#histogramGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
