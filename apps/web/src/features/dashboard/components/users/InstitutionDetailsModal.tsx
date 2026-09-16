import { Modal } from "../../../../components/atoms/Modal";
import type { InstitutionOption } from "../../api/dashboard";
import { Building2, Receipt, UserCircle2 } from "lucide-react";

interface Props {
  institution: InstitutionOption;
  onClose: () => void;
}

export function InstitutionDetailsModal({ institution, onClose }: Props) {
  return (
    <Modal isOpen onClose={onClose} title="Detalles de la institución">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-app-text-main flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-app-primary" />
            Información General
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-app-text-muted">Nombre fantasía</p>
              <p className="font-medium text-app-text-main">{institution.name}</p>
            </div>
            <div>
              <p className="text-app-text-muted">Estado</p>
              <p className="font-medium text-app-text-main">{institution.isActive ? 'Activa' : 'Inactiva'}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-app-border pt-4">
          <h3 className="font-semibold text-app-text-main flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-app-primary" />
            Datos de Facturación
          </h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
            <div className="col-span-2">
              <p className="text-app-text-muted">Razón Social</p>
              <p className="font-medium text-app-text-main">{institution.legalName || "—"}</p>
            </div>
            <div>
              <p className="text-app-text-muted">CUIT / NIT</p>
              <p className="font-medium text-app-text-main">{institution.taxId || "—"}</p>
            </div>
            <div>
              <p className="text-app-text-muted">Condición Fiscal</p>
              <p className="font-medium text-app-text-main">{institution.taxCondition || "—"}</p>
            </div>
            <div>
              <p className="text-app-text-muted">Email Facturación</p>
              <p className="font-medium text-app-text-main">{institution.billingEmail || "—"}</p>
            </div>
            <div>
              <p className="text-app-text-muted">Teléfono</p>
              <p className="font-medium text-app-text-main">{institution.billingPhone || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-app-text-muted">Dirección</p>
              <p className="font-medium text-app-text-main">
                {[institution.billingAddress, institution.billingCity, institution.billingProvince].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-app-border pt-4">
          <h3 className="font-semibold text-app-text-main flex items-center gap-2 mb-3">
            <UserCircle2 className="w-4 h-4 text-app-primary" />
            Responsable Administrativo
          </h3>
          <div className="text-sm">
            <p className="text-app-text-muted">Usuario vinculado</p>
            <p className="font-medium text-app-text-main">{institution.responsibleTherapistName || "Ninguno"}</p>
          </div>
        </div>
        
        <div className="pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-app-surface border border-app-border rounded-lg text-sm font-medium hover:bg-app-bg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
