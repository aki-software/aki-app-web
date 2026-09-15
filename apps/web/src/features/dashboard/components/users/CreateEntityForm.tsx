import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { EntityFormState } from "./CreateEntityForm.types";

interface Props {
  formState: EntityFormState;
  setFormState: Dispatch<SetStateAction<EntityFormState>>;
  saving: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isEditing?: boolean;
  onCancel?: () => void;
}

export function CreateEntityForm({
  formState,
  setFormState,
  saving,
  onSubmit,
  isEditing,
  onCancel,
}: Props) {
  const updateForm = (field: keyof EntityFormState, value: string) => {
    setFormState((prev: EntityFormState) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="app-card !p-6">
      <div className="mb-4 flex items-center">
        <h3 className="font-semibold text-app-text-main">
          {isEditing ? "Editar institución" : "Crear institución"}
        </h3>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-app-text-muted">Nombre</span>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => updateForm("name", e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
            />
          </label>

          {!isEditing ? (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">
                Email (acceso)
              </span>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => updateForm("email", e.target.value)}
                required
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              />
            </label>
          ) : null}

          <label className="space-y-1 text-sm">
            <span className="font-medium text-app-text-muted">
              Email de facturación (opcional)
            </span>
            <input
              type="email"
              value={formState.billingEmail}
              onChange={(e) => updateForm("billingEmail", e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
            />
          </label>
        </div>
        
        <div className="mt-6 mb-4">
          <h4 className="font-semibold text-sm text-app-text-main border-b border-app-border pb-2">Datos de Facturación (Opcional)</h4>
          <p className="text-xs text-app-text-muted mt-1 mb-4">Estos datos se utilizarán para emitir la factura. Si no los completás ahora, la institución deberá completarlos al momento de la compra.</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">Razón Social</span>
              <input
                type="text"
                value={formState.legalName}
                onChange={(e) => updateForm("legalName", e.target.value)}
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                placeholder="Ej. Asociación Civil..."
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">CUIT</span>
              <input
                type="text"
                value={formState.taxId}
                onChange={(e) => updateForm("taxId", e.target.value)}
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                placeholder="Sin guiones"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">Condición frente al IVA</span>
              <select
                value={formState.taxCondition}
                onChange={(e) => updateForm("taxCondition", e.target.value)}
                className="app-select w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              >
                <option value="">Seleccionar...</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Exento">Exento</option>
                <option value="Consumidor Final">Consumidor Final</option>
                <option value="Monotributo">Monotributo</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">Domicilio Fiscal</span>
              <input
                type="text"
                value={formState.billingAddress}
                onChange={(e) => updateForm("billingAddress", e.target.value)}
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              />
            </label>
          </div>
        </div>

         <div className="flex justify-end gap-3">
           {isEditing && (
             <button
               type="button"
               onClick={onCancel}
               className="app-button-secondary"
             >
               Cancelar
             </button>
           )}
           <button
             type="submit"
             disabled={saving}
             className="app-button-primary disabled:opacity-60"
           >
             {saving ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
           </button>
         </div>

      </form>
    </div>
  );
}
