import { useState, useEffect } from "react";
import { Edit2, Building2 } from "lucide-react";
import { useUpdateBillingProfile } from "../hooks/useInstitutionProfile";
import { Button } from "../../../components/atoms/Button";
import { Spinner } from "../../../components/atoms/Spinner";
import type { UpdateBillingProfileDto, InstitutionResponse } from "@akit/contracts";

interface BillingProfileCardProps {
  profile: InstitutionResponse | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function BillingProfileCard({ profile, isLoading, refetch }: BillingProfileCardProps) {
  const { mutateAsync: updateProfile, isMutating } = useUpdateBillingProfile();
  
  const hasMissingData = profile ? (!profile.legalName || !profile.taxId || !profile.taxCondition || !profile.billingAddress) : false;
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateBillingProfileDto>({
    legalName: "",
    taxId: "",
    taxCondition: "",
    billingAddress: "",
  });

  // Sync state when profile is loaded
  useEffect(() => {
    if (profile && hasMissingData) {
      setFormData({
        legalName: profile.legalName || "",
        taxId: profile.taxId || "",
        taxCondition: profile.taxCondition || "",
        billingAddress: profile.billingAddress || "",
      });
      setIsEditing(true);
    }
  }, [profile, hasMissingData]);

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

  if (isEditing) {
    return (
      <div className="app-card border border-app-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-app-primary" />
          <h3 className="text-lg font-display font-semibold text-app-text-main">
            Editar datos de facturación
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                placeholder="Sin guiones"
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
              <span className="font-medium text-app-text-muted">Domicilio Fiscal</span>
              <input
                required
                type="text"
                value={formData.billingAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, billingAddress: e.target.value }))}
                className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              />
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isMutating}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isMutating}>
              Guardar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="app-card border border-app-border p-6 flex flex-col justify-between items-start md:flex-row md:items-center gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-app-primary" />
          <h3 className="text-lg font-display font-semibold text-app-text-main">
            Datos de facturación
          </h3>
        </div>
        {hasMissingData ? (
          <p className="text-sm text-app-text-muted max-w-lg">
            Por favor, completá los datos de facturación para poder adquirir nuevos lotes de vouchers.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3 text-sm text-app-text-main">
            <div><span className="text-app-text-muted">Razón Social:</span> {profile.legalName}</div>
            <div><span className="text-app-text-muted">CUIT:</span> {profile.taxId}</div>
            <div><span className="text-app-text-muted">Condición IVA:</span> {profile.taxCondition}</div>
            <div><span className="text-app-text-muted">Domicilio:</span> {profile.billingAddress}</div>
          </div>
        )}
      </div>
      <Button variant={hasMissingData ? "primary" : "outline"} onClick={handleEdit} className="shrink-0">
        <Edit2 className="w-4 h-4 mr-2" />
        {hasMissingData ? "Completar datos" : "Editar datos"}
      </Button>
    </div>
  );
}
