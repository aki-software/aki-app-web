import { CATEGORY_COLORS } from "../../constants/category-colors";
import type { CategoryData } from "../../api/dashboard";
import { Award, Target, TrendingUp, Info } from "lucide-react";

interface Props {
  top3: { cat: string; pct: number }[];
  bottom3: { cat: string; pct: number }[];
  categoriesMap: Record<string, CategoryData>;
}

export function SessionTopAreas({ top3, bottom3, categoriesMap }: Props) {
  return (
    <div className="space-y-12">
      {/* ─── Afinidades Dominantes Lux 3.0 ───────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-app-primary/10 rounded-lg">
                <Award className="h-5 w-5 text-app-primary" />
            </div>
            <h2 className="app-label !text-xs tracking-[0.3em]">Afinidades Dominantes</h2>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3">
          {top3.map(({ cat, pct }, i) => {
            const label = categoriesMap[cat]?.title ?? cat;
            const colorInfo = CATEGORY_COLORS[cat] ?? { color: "var(--color-app-text-muted)" };
            const rankIcons = [Target, TrendingUp, Info];
            const Icon = rankIcons[i] || Info;

            return (
              <div 
                key={cat} 
                className="app-card-interactive relative overflow-hidden !p-10 group"
              >
                {/* Indicador de Rango Lux */}
                <div className="absolute -right-6 -top-6 flex h-24 w-24 items-center justify-center rounded-full bg-app-bg text-4xl font-black text-app-text-muted/5 transition-all group-hover:text-app-primary/10 group-hover:scale-110">
                  {i + 1}
                </div>

                <div className="relative space-y-8">
                  <div className="rounded-2xl bg-app-bg p-4 w-fit border border-app-border transition-transform group-hover:rotate-12 group-hover:border-app-primary/30">
                    <Icon className="h-6 w-6 text-app-text-muted group-hover:text-app-primary transition-colors" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-app-text-main group-hover:text-app-primary transition-colors tracking-tight leading-none">
                        {label}
                    </h3>
                    
                    <div className="mt-6 flex items-baseline gap-2">
                        <span className="app-value !text-4xl">{pct}</span>
                        <span className="app-label opacity-40">coincidencia</span>
                    </div>
                  </div>

                  {/* Barra de Color Técnica */}
                  <div className="h-2 w-12 rounded-full shadow-lg" style={{ backgroundColor: colorInfo.color, boxShadow: `0 4px 12px ${colorInfo.color}40` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Indicadores de menor inclinación Lux 3.0 ────────────────── */}
      <div className="app-card !p-10 border-app-border bg-app-bg/30 shadow-none">
        <div className="flex items-center gap-3 mb-10">
            <div className="h-1.5 w-6 bg-app-text-muted/20 rounded-full"></div>
            <h2 className="app-label opacity-50">Zonas de Menor Inflexión</h2>
        </div>
        
        <div className="grid gap-12 md:grid-cols-3">
          {bottom3.map(({ cat, pct }) => {
            const label = categoriesMap[cat]?.title ?? cat;
            return (
              <div key={cat} className="flex flex-col gap-4 border-l-4 border-app-border pl-8 transition-colors hover:border-app-primary/30 group">
                <span className="app-label !text-[9px] opacity-40 group-hover:opacity-100 transition-opacity">
                  {label}
                </span>
                <span className="text-xl font-black text-app-text-main tabular-nums tracking-tighter">
                  {pct}% <span className="app-label !text-[8ppx] ml-2 opacity-30">Matching</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
