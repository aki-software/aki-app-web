import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CategoryDistributionData } from "@akit/contracts";

// 12 Colors mapped for the 12 categories to keep UI vibrant
const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6", "#F43F5E", "#EAB308", "#0EA5E9", "#64748B"];

interface ResultsDistributionChartProps {
  data: CategoryDistributionData[];
}

export function ResultsDistributionChart({ data }: ResultsDistributionChartProps) {
  // Sort data by count descending for a better BarChart visualization
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribución de Intereses</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Resultados predominantes en la plataforma</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={sortedData} 
            layout="vertical" 
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={70} 
              tick={{ fontSize: 11, fill: '#6B7280' }} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#111827", borderRadius: "8px", border: "none", color: "#F9FAFB" }}
              itemStyle={{ color: "#F3F4F6" }}
              cursor={{ fill: '#F3F4F6', opacity: 0.1 }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
              {sortedData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
