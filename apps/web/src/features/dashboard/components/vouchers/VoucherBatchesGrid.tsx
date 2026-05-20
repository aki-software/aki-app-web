import { Filter } from "lucide-react";
import { VoucherBatchSummary } from "../../api/dashboard";
import { VoucherBatchRow } from "./VoucherBatchRow";
import { Pagination } from "../../../../components/molecules/Pagination";
import { EmptyState } from "../../../../components/molecules/EmptyState";

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
          <div className="col-span-full py-10">
            <EmptyState
              icon={<Filter className="h-10 w-10" />}
              title="Sin resultados"
              description="No hay lotes que coincidan con estos filtros."
            />
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