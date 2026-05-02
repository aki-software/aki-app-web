import { LayoutGrid, List, Search } from "lucide-react";
import { Select } from "../../../../components/atoms/Select";

// 1. Tipamos estrictamente para que coincida con tu Hook
type ViewMode = "BATCHES" | "INDIVIDUAL";
type StatusFilter = "ALL" | "AVAILABLE" | "USED" | "EXPIRED";
type ExpirationFilter = "ALL" | "EXPIRING_7D" | "NO_EXPIRATION";

interface VouchersFilterBarProps {
  isAdmin: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  expirationFilter: ExpirationFilter;
  setExpirationFilter: (val: ExpirationFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (val: StatusFilter) => void;
  clientFilter: string;
  setClientFilter: (val: string) => void;
  clientOptions: Array<{ id: string; name: string }>;
}

export const VouchersFilterBar = ({
  isAdmin,
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  expirationFilter,
  setExpirationFilter,
  statusFilter,
  setStatusFilter,
  clientFilter,
  setClientFilter,
  clientOptions,
}: VouchersFilterBarProps) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-end gap-6">
      
      {/* 1. Buscador */}
      <div className="relative flex-1 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-app-text-muted group-focus-within:text-app-primary transition-colors" />
        <input
          type="text"
          placeholder={viewMode === "BATCHES" ? "Buscar por lote o institución..." : "Buscar por código o paciente..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="app-card !p-4 !pl-14 w-full bg-app-surface border-app-border focus:border-app-primary outline-none transition-all shadow-xl !rounded-2xl"
        />
      </div>

      {/* 2. Filtro de Estado (Solo si estamos viendo individuales) */}
      {viewMode === "INDIVIDUAL" && (
        <div className="flex items-center gap-1.5 p-1.5 bg-app-bg border border-app-border rounded-xl">
          {[
            { id: "ALL", label: "Todos" },
            { id: "AVAILABLE", label: "Disponibles" },
            { id: "USED", label: "Consumidos" },
            { id: "EXPIRED", label: "Vencidos" },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id as StatusFilter)}
              className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                statusFilter === filter.id
                  ? "bg-app-surface text-app-primary shadow-sm border border-app-border/20"
                  : "text-app-text-muted hover:text-app-primary"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* 3. Filtro de Vencimiento */}
      <div className="w-48">
        <Select
          value={expirationFilter}
          // Usamos `as ExpirationFilter` porque e.target.value siempre es un string genérico para React
          onChange={(e) => setExpirationFilter(e.target.value as ExpirationFilter)}
          options={[
            { value: "ALL", label: "Vencimiento: Todos" },
            { value: "EXPIRING_7D", label: "Vencen en 7 días" },
            { value: "NO_EXPIRATION", label: "Sin expiración" },
          ]}
        />
      </div>

      {/* 4. Filtro de Institución (Solo Admins) */}
      {isAdmin && (
        <div className="w-48">
          <Select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            options={[
              { value: "ALL", label: "Institución: Todas" },
              ...clientOptions.map((c) => ({ value: c.id, label: c.name }))
            ]}
          />
        </div>
      )}

      {/* 5. Selector de Vista Lotes/Individual (Solo No-Admins) */}
      {!isAdmin && (
        <div className="flex items-center gap-1.5 p-1.5 bg-app-bg border border-app-border rounded-xl shadow-inner min-w-[240px]">
          <button
            onClick={() => setViewMode("BATCHES")}
            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
              viewMode === "BATCHES"
                ? "bg-app-surface text-app-primary shadow-lg border border-app-border/40"
                : "text-app-text-muted hover:text-app-primary"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Lotes
          </button>
          <button
            onClick={() => setViewMode("INDIVIDUAL")}
            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
              viewMode === "INDIVIDUAL"
                ? "bg-app-surface text-app-primary shadow-lg border border-app-border/40"
                : "text-app-text-muted hover:text-app-primary"
            }`}
          >
            <List className="h-3.5 w-3.5" /> Individual
          </button>
        </div>
      )}
    </div>
  );
};