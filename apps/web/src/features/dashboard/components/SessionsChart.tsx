import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SessionActivityData } from "@akit/contracts";

interface SessionsChartProps {
  data: SessionActivityData[];
}

export function SessionsChart({ data }: SessionsChartProps) {
  return (
    <div className="app-card shadow-xl shadow-app-primary/5">
      <div className="mb-8">
        <h3 className="text-sm font-black text-app-text-main uppercase tracking-widest tracking-[0.2em]">Actividad de Sesiones</h3>
        <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mt-1">Total de evaluaciones por día (última semana)</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            {/* Usamos variables CSS para que el gráfico sea reactivo al tema */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-app-border)" />
            <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "var(--color-app-text-muted)", fontSize: 10, fontWeight: 700 }} 
                dy={15} 
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "var(--color-app-text-muted)", fontSize: 10, fontWeight: 700 }} 
                dx={-10} 
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: "var(--color-app-surface)", 
                borderRadius: "16px", 
                border: "1px solid var(--color-app-border)", 
                color: "var(--color-app-text-main)",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
                fontWeight: "900"
              }}
              itemStyle={{ color: "var(--color-app-primary)" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-app-primary)"
              strokeWidth={4}
              dot={{ r: 5, fill: "var(--color-app-primary)", strokeWidth: 3, stroke: "var(--color-app-surface)" }}
              activeDot={{ r: 8, strokeWidth: 0, fill: "var(--color-app-primary)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
