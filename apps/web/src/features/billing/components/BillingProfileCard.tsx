import { useState } from "react";
import { Edit2, Building2 } from "lucide-react";
import { useUpdateBillingProfile } from "../hooks/useInstitutionProfile";
import { Button } from "../../../components/atoms/Button";
import { Spinner } from "../../../components/atoms/Spinner";
import { Modal } from "../../../components/atoms/Modal";
import type { UpdateBillingProfileDto, InstitutionResponse } from "@akit/contracts";

interface BillingProfileCardProps {
  profile: InstitutionResponse | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function BillingProfileCard({ profile, isLoading, refetch }: BillingProfileCardProps) {
  const { mutateAsync: updateProfile, isMutating } = useUpdateBillingProfile();
  
  const hasMissingData = profile ? (!profile.legalName || !profile.taxId || !profile.taxCondition || !profile.billingAddress || !profile.billingCity || !profile.billingProvince || !profile.billingPhone) : false;
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateBillingProfileDto>({
    legalName: "",
    taxId: "",
    taxCondition: "",
    billingAddress: "",
    billingCity: "",
    billingProvince: "",
    billingPhone: "",
  });

  // Removed auto-open useEffect based on user feedback

  if (isLoading) {
    return (
      <div className="app-card border border-app-border p-6 flex justify-center">
        <Spinner size="md" className="border-app-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const handleEdit = () => {
    setFormData({
      legalName: profile.legalName || "",
      taxId: profile.taxId || "",
      taxCondition: profile.taxCondition || "",
      billingAddress: profile.billingAddress || "",
      billingCity: profile.billingCity || "",
      billingProvince: profile.billingProvince || "",
      billingPhone: profile.billingPhone || "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(formData);
    await refetch();
    setIsEditing(false);
  };

  return (
    <>
      <div className="app-card border border-app-border p-6 flex flex-col gap-4 items-start">
        <div className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-app-primary" />
            <h3 className="text-lg font-display font-semibold text-app-text-main">
              Datos de facturación
            </h3>
          </div>
          {hasMissingData ? (
            <p className="text-sm text-app-text-muted">
              Por favor, completá los datos de facturación para poder adquirir nuevos lotes de vouchers.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm text-app-text-main">
              <div><span className="text-app-text-muted">Razón Social:</span> {profile.legalName}</div>
              <div><span className="text-app-text-muted">CUIT:</span> {profile.taxId}</div>
              <div><span className="text-app-text-muted">Condición IVA:</span> {profile.taxCondition}</div>
              <div className="sm:col-span-2"><span className="text-app-text-muted">Domicilio:</span> {profile.billingAddress}, {profile.billingCity}, {profile.billingProvince}</div>
              <div><span className="text-app-text-muted">Celular:</span> {profile.billingPhone}</div>
            </div>
          )}
        </div>
        <Button variant={hasMissingData ? "primary" : "outline"} onClick={handleEdit} className="shrink-0">
          <Edit2 className="w-4 h-4 mr-2" />
          {hasMissingData ? "Completar datos" : "Editar datos"}
        </Button>
      </div>

      <Modal
        isOpen={isEditing}
        onClose={handleCancel}
        title="Datos de facturación"
        subtitle="Administración"
        size="lg"
        isLoading={isMutating}
        footer={
          <>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isMutating}>
              Cancelar
            </Button>
            <Button type="submit" form="billing-form" isLoading={isMutating}>
              Guardar
            </Button>
          </>
        }
      >
        <form id="billing-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">Razón Social</span>
              <input
                required
                type="text"
                value={formData.legalName}
                onChange={(e) => setFormData((prev) => ({ ...prev, legalName: e.target.value }))}
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">CUIT</span>
              <input
                required
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData((prev) => ({ ...prev, taxId: e.target.value }))}
                pattern="^\d{2}-?\d{8}-?\d{1}$"
                title="El CUIT debe tener 11 dígitos, con o sin guiones (ej: 20-12345678-9)"
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                placeholder="20-12345678-9"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">Condición frente al IVA</span>
              <select
                required
                value={formData.taxCondition}
                onChange={(e) => setFormData((prev) => ({ ...prev, taxCondition: e.target.value }))}
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
              <span className="font-medium text-app-text-muted">Domicilio (Calle y Número)</span>
              <input
                required
                type="text"
                value={formData.billingAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, billingAddress: e.target.value }))}
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">Ciudad</span>
              <input
                required
                type="text"
                value={formData.billingCity}
                onChange={(e) => setFormData((prev) => ({ ...prev, billingCity: e.target.value }))}
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">Provincia</span>
              <input
                required
                type="text"
                value={formData.billingProvince}
                onChange={(e) => setFormData((prev) => ({ ...prev, billingProvince: e.target.value }))}
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">Celular / Teléfono</span>
              <input
                required
                type="tel"
                value={formData.billingPhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, billingPhone: e.target.value }))}
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              />
            </label>
          </div>
        </form>
      </Modal>
    </>
  );
}
