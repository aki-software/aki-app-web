import { Award, Info, Target, TrendingUp } from "lucide-react";
import type { CategoryData } from "../../api/dashboard";
import { CATEGORY_COLORS } from "../../constants/category-colors";

interface Props {
  top3: { cat: string; pct: number }[];
  bottom3: { cat: string; pct: number }[];
  categoriesMap: Record<string, CategoryData>;
}

function DominantAreaCard({ 
  cat, 
  pct, 
  rank, 
  label 
}: { 
  cat: string; 
  pct: number; 
  rank: number; 
  label: string;
}) {
  const colorInfo = CATEGORY_COLORS[cat] || { color: "var(--color-app-text-muted)" };
  const rankIcons = [Target, TrendingUp, Info];
  const Icon = rankIcons[rank] || Info;

  return (
    <div className="app-card-interactive group relative overflow-hidden !p-7 lg:!p-8">
      {/* Indicador de Rango */}
      <div className="absolute -right-4 -top-4 flex h-16 w-16 items-center justify-center rounded-full bg-app-bg text-2xl font-black text-app-text-muted/10 transition-all group-hover:text-app-primary/20 select-none">
        {rank + 1}
      </div>

      <div className="relative flex h-full flex-col gap-6">
        <div className="w-fit rounded-2xl border border-app-border bg-app-bg p-3 transition-transform group-hover:rotate-6 group-hover:border-app-primary/30">
          <Icon className="h-5 w-5 text-app-text-muted transition-colors group-hover:text-app-primary" />
        </div>

        <div className="space-y-4">
          <h3 className="min-h-[2.75rem] text-lg font-black leading-tight tracking-tight text-app-text-main transition-colors group-hover:text-app-primary">
            {label}
          </h3>

          <div className="flex items-end gap-2">
            <span className="app-value !text-3xl sm:!text-4xl">
              {pct}
            </span>
            <span className="app-label mb-1 opacity-50">
              % coincidencia
            </span>
          </div>
        </div>

        {/* Barra de Color Técnica con Glow */}
        <div
          className="mt-auto h-2 w-16 rounded-full"
          style={{
            backgroundColor: colorInfo.color,
            boxShadow: `0 4px 12px ${colorInfo.color}60`, // Aumenté un poco el glow (60)
          }}
        />
      </div>
    </div>
  );
}

export function SessionTopAreas({ top3, bottom3, categoriesMap }: Props) {
  return (
    <div className="space-y-10">
      
      {/* ─── Sección Superior: Afinidades Dominantes ─── */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-app-primary/10 p-2">
            <Award className="h-5 w-5 text-app-primary" />
          </div>
          <h2 className="app-label !text-[10px] tracking-[0.24em] uppercase">
            Afinidades Dominantes
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {top3.map((item, i) => (
            <DominantAreaCard
              key={item.cat}
              cat={item.cat}
              pct={item.pct}
              rank={i}
              label={categoriesMap[item.cat]?.title || item.cat}
            />
          ))}
        </div>
      </div>

      {/* ─── Sección Inferior: Zonas de Menor Inclinación ─── */}
      <div className="app-card border-app-border bg-app-bg/30 !p-8 shadow-none lg:!p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-1.5 w-6 rounded-full bg-app-text-muted/20" />
          <h2 className="app-label opacity-50 uppercase tracking-widest !text-[9px]">
            Zonas de menor inclinación
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {bottom3.map(({ cat, pct }) => (
            <div
              key={cat}
              className="group flex min-w-0 flex-col gap-2 rounded-2xl border border-app-border/70 bg-app-surface p-5 transition-all hover:border-app-primary/30 hover:bg-app-surface/80"
            >
              <span className="app-label !text-[9px] opacity-50 transition-opacity group-hover:opacity-100 truncate">
                {categoriesMap[cat]?.title || cat}
              </span>
              <span className="text-xl font-black tabular-nums tracking-tighter text-app-text-main">
                {pct}%
                <span className="ml-2 app-label !text-[8px] opacity-40">
                  Matching
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};