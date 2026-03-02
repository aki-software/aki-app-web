import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SessionActivityData } from "@akit/contracts";

interface SessionsChartProps {
  data: SessionActivityData[];
}

export function SessionsChart({ data }: SessionsChartProps) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Actividad de Sesiones</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Total de sesiones por día (última semana)</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6B7280" }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280" }} dx={-10} />
            <Tooltip
              contentStyle={{ backgroundColor: "#111827", borderRadius: "8px", border: "none", color: "#F9FAFB" }}
              itemStyle={{ color: "#F3F4F6" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#FFFFFF" }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
