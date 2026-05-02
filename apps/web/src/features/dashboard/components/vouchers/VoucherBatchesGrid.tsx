import { Filter } from "lucide-react";
import { VoucherBatchSummary } from "../../api/dashboard";
import { VoucherBatchRow } from "./VoucherBatchRow";
import { Pagination } from "../../../../components/molecules/Pagination";

interface VoucherBatchesGridProps {
  items: VoucherBatchSummary[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOpenDetail: (batchId: string) => void;
}

export const VoucherBatchesGrid = ({
  items,
  currentPage,
  totalPages,
  onPageChange,
  onOpenDetail,
}: VoucherBatchesGridProps) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.length === 0 ? (
          <div className="col-span-full app-card !p-20 text-center flex flex-col items-center gap-4 opacity-40">
            <Filter className="h-12 w-12" />
            <p className="app-label">No hay lotes que coincidan con estos filtros</p>
          </div>
        ) : (
          items.map((batch) => (
            <VoucherBatchRow key={batch.batchId} batch={batch} onOpenDetail={onOpenDetail} />
          ))
        )}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};