import { useState } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { SessionCategoryChart } from "./SessionCategoryChart";

// Nota: Ajustá estos tipos según lo que exporte tu hook/API
interface TechnicalDataAccordionProps {
  sortedResults: Array<{ cat: string; pct: number }>;
  top3: Array<{ cat: string; pct: number }>;
  categoriesMap: Record<string, any>;
}

export const TechnicalDataAccordion = ({ 
  sortedResults, 
  top3, 
  categoriesMap 
}: TechnicalDataAccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pt-16">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-10 rounded-[3rem] border border-app-border bg-app-surface shadow-xl hover:shadow-2xl hover:scale-[1.005] transition-all group active:scale-95"
      >
        <div className="flex items-center gap-6">
          <div className="p-4 bg-app-bg rounded-2xl border border-app-border">
            <Activity className="h-6 w-6 text-app-text-muted group-hover:text-app-primary transition-colors" />
          </div>
          <div className="flex flex-col items-start gap-1">
            <span className="app-value !text-xl mt-0">Detalle por Categoría</span>
            <span className="app-label opacity-40 uppercase tracking-[0.4em]">Puntaje por área evaluada</span>
          </div>
        </div>
        <div className="h-16 w-16 flex items-center justify-center rounded-full bg-app-bg border border-app-border group-hover:bg-app-primary group-hover:text-white transition-all">
          {isOpen ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-12 animate-in duration-700">
          <SessionCategoryChart 
            sortedResults={sortedResults} 
            top3={top3} 
            categoriesMap={categoriesMap} 
          />
        </div>
      )}
    </div>
  );
};