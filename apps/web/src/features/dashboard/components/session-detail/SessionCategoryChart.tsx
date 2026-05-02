import { CATEGORY_COLORS } from "../../constants/category-colors";
import type { CategoryData } from "../../api/dashboard";
import { CheckCircle2 } from "lucide-react";

interface Props {
  sortedResults: { cat: string; pct: number }[];
  top3: { cat: string; pct: number }[];
  categoriesMap: Record<string, CategoryData>;
}

export function SessionCategoryChart({ sortedResults, top3, categoriesMap }: Props) {
  return (
    <div className="rounded-[2.5rem] border border-app-border bg-app-surface p-10 shadow-sm transition-all duration-300">
      <h2 className="mb-10 text-[11px] font-black uppercase tracking-[0.3em] text-app-text-muted">
        Desglose Detallado de Dimensiones (12 Áreas)
      </h2>

      <div className="space-y-6">
        {sortedResults.map(({ cat, pct }) => {
          const label = categoriesMap[cat]?.title ?? cat;
          const colorInfo = CATEGORY_COLORS[cat] ?? { color: "#64748b" };
          const isTop = top3.some((t) => t.cat === cat);

          return (
            <div key={cat} className="flex items-center gap-6 group">
              <div className="w-32 shrink-0 text-right">
                <span className={`text-[10px] font-black uppercase tracking-tight transition-colors ${
                    isTop ? "text-app-text-main" : "text-app-text-muted"
                }`}>
                    {label}
                </span>
              </div>
              
              <div className="flex-1">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-app-bg border border-app-border/30">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(63,52,41,0.12)] dark:shadow-[0_0_8px_rgba(0,0,0,0.2)]"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: colorInfo.color,
                      opacity: isTop ? 1 : 0.3,
                    }}
                  />
                </div>
              </div>

              <div className="w-16 shrink-0 text-right">
                <span className={`font-mono text-xs font-black ${
                    isTop ? "text-app-primary" : "text-app-text-muted"
                }`}>
                    {pct}%
                </span>
              </div>

              <div className="w-6 shrink-0 flex justify-center">
                {isTop && (
                    <div className="text-app-primary animate-in zoom-in duration-500">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
