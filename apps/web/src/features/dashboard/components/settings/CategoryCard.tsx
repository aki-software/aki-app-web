import { BookOpen, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { CategoryData } from "../../api/dashboard";

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
    <div className="app-card !p-5 hover:border-app-primary/35 transition-all">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start space-x-3 min-w-0">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-primary/20 bg-app-primary/10">
            <BookOpen className="h-4 w-4 text-app-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="truncate text-lg font-bold text-app-text-main">{category.title}</h3>
              <span className="rounded border border-app-border bg-app-bg px-2 py-0.5 text-xs text-app-text-muted">
                {category.categoryId}
              </span>
            </div>

            <div className="mt-2">
              <p className="whitespace-pre-line text-sm text-app-text-muted">
                {isExpanded 
                  ? category.description 
                  : isLongText 
                    ? `${category.description.slice(0, PREVIEW_CHARS)}...` 
                    : category.description}
              </p>

              {isLongText && (
                <button
                  onClick={onToggleExpand}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-main hover:text-app-primary transition-colors"
                >
                  {isExpanded ? (
                    <>Ver menos <ChevronUp className="h-4 w-4" /></>
                  ) : (
                    <>Ver más <ChevronDown className="h-4 w-4" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="mt-1 flex shrink-0 items-center rounded-lg border border-app-border px-3 py-1.5 text-sm font-medium hover:text-app-primary transition-colors"
        >
          <Edit2 className="w-4 h-4 mr-1.5" /> Editar
        </button>
      </div>
    </div>
  );
};