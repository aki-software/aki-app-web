import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-main hover:text-app-primary disabled:opacity-50 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Anterior
      </button>
      
      <div className="text-xs text-app-text-muted">
        Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-main hover:text-app-primary disabled:opacity-50 transition-colors"
      >
        Siguiente <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};