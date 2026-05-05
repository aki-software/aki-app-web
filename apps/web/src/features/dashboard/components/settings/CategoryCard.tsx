import { BookOpen, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import type { CategoryData } from "../../api/dashboard";
import { Button } from "../../../../components/atoms/Button";

interface CategoryCardProps {
  category: CategoryData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
}

const PREVIEW_CHARS = 360;

export const CategoryCard = ({ category, isExpanded, onToggleExpand, onEdit }: CategoryCardProps) => {
  const isLongText = category.description.length > PREVIEW_CHARS;
  
  return (
    <div className="app-card !p-6 hover:border-app-primary/35 transition-all group">
      <div className="flex justify-between items-start gap-6">
        <div className="flex items-start space-x-4 min-w-0">
          {/* Icono de Categoría Lux */}
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-primary/20 bg-app-primary/5 transition-colors group-hover:bg-app-primary/10">
            <BookOpen className="h-5 w-5 text-app-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="truncate text-lg font-black tracking-tight text-app-text-main uppercase">
                {category.title}
              </h3>
              <span className="rounded-lg border border-app-border bg-app-bg px-2.5 py-0.5 text-[10px] font-black tracking-widest text-app-text-muted uppercase">
                {category.categoryId}
              </span>
            </div>

            <div className="mt-3">
              <p className="whitespace-pre-line text-sm leading-relaxed text-app-text-muted/80">
                {isExpanded 
                  ? category.description 
                  : isLongText 
                    ? `${category.description.slice(0, PREVIEW_CHARS)}...` 
                    : category.description}
              </p>

              {isLongText && (
                <Button
                  variant="outline"
                  onClick={onToggleExpand}
                  className="mt-4 !py-1.5 !px-3 !text-[11px] !rounded-lg h-auto font-bold"
                >
                  {isExpanded ? (
                    <>Ver menos <ChevronUp className="ml-1.5 h-3.5 w-3.5" /></>
                  ) : (
                    <>Ver más <ChevronDown className="ml-1.5 h-3.5 w-3.5" /></>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Botón de Acción Principal usando el Átomo */}
        <Button
          variant="outline"
          onClick={onEdit}
          className="shrink-0 !py-2 !px-4 !rounded-xl !text-xs font-black uppercase tracking-wider group/edit"
        >
          <Edit2 className="w-3.5 h-3.5 mr-2 transition-transform group-hover/edit:-rotate-12" /> 
          Editar
        </Button>
      </div>
    </div>
  );
};