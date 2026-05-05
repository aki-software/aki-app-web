import { useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { SessionCategoryChart } from "./SessionCategoryChart";
import { Button } from "../../../../components/atoms/Button"; // Importamos el átomo
import type { CategoryData } from "../../api/dashboard";

interface TechnicalDataAccordionProps {
  sortedResults: Array<{ cat: string; pct: number }>;
  top3: Array<{ cat: string; pct: number }>;
  categoriesMap: Record<string, CategoryData>;
}

export const TechnicalDataAccordion = ({ 
  sortedResults, 
  top3, 
  categoriesMap 
}: TechnicalDataAccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pt-16">
  
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen ? "true" : "false"} 
        className="flex h-auto w-full items-center justify-between p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-app-border bg-app-surface shadow-xl hover:shadow-2xl hover:scale-[1.005] transition-all group active:scale-[0.98]"
      >
        <div className="flex items-center gap-6">
          <div className="p-4 bg-app-bg rounded-2xl border border-app-border transition-colors group-hover:border-app-primary/30">
            <Activity className="h-6 w-6 text-app-text-muted group-hover:text-app-primary transition-colors" />
          </div>
          
          <div className="flex flex-col items-start gap-1 text-left">
            <span className="app-value !text-xl md:!text-2xl mt-0 transition-colors group-hover:text-app-primary">
              Detalle por Categoría
            </span>
            <span className="app-label opacity-40 uppercase tracking-[0.3em] md:tracking-[0.4em] !text-[9px] md:!text-[10px]">
              Puntaje por área evaluada
            </span>
          </div>
        </div>

        {/* Indicador Visual - Se mantiene igual para la animación */}
        <div className={`h-14 w-14 md:h-16 md:w-16 flex items-center justify-center rounded-full bg-app-bg border border-app-border transition-all duration-500 ${
          isOpen ? 'bg-app-primary border-app-primary text-white rotate-180' : 'group-hover:border-app-primary/50 group-hover:text-app-primary'
        }`}>
          <ChevronDown className="h-6 w-6" />
        </div>
      </Button>

      {/* Contenido Expandible */}
      {isOpen && (
        <div className="mt-12 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
          <div className="app-card border-app-border/40 bg-app-surface/50 !p-2 md:!p-8">
            <SessionCategoryChart 
              sortedResults={sortedResults} 
              top3={top3} 
              categoriesMap={categoriesMap} 
            />
          </div>
        </div>
      )}
    </div>
  );
};