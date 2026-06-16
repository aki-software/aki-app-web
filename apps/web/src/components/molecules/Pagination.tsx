import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-main hover:text-app-primary disabled:opacity-50 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
      </button>

      <div className="flex items-center gap-1">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
              page === currentPage
                ? 'bg-app-primary text-white'
                : 'text-app-text-muted hover:text-app-primary'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-main hover:text-app-primary disabled:opacity-50 transition-colors"
      >
        Siguiente <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};