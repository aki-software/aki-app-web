import { Loader2, Send } from "lucide-react";
import { type FormEvent, useMemo } from "react";
import type { InstitutionOption, TherapistOption } from "../../api/dashboard";

export type VoucherFormState = {
  ownerInstitutionId: string;
  ownerUserId: string;
  quantity: string;
  expiresAt: string;
};

export const initialFormState: VoucherFormState = {
  ownerInstitutionId: "",
  ownerUserId: "",
  quantity: "1",
  expiresAt: "",
};

interface Props {
  institutions: InstitutionOption[];
  therapists: TherapistOption[];
  formState: VoucherFormState;
  setFormState: React.Dispatch<React.SetStateAction<VoucherFormState>>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  resetMessages: () => void;
}

export function VoucherEmitForm({
  institutions,
  therapists,
  formState,
  setFormState,
  onSubmit,
  saving,
  errorMessage,
  successMessage,
  resetMessages,
}: Props) {
  const therapistOptions = useMemo(() => {
    return therapists.filter((therapist) =>
      formState.ownerInstitutionId
        ? therapist.institutionId === formState.ownerInstitutionId
        : false,
    );
  }, [formState.ownerInstitutionId, therapists]);

  const updateForm = (field: keyof VoucherFormState, value: string) => {
    resetMessages();
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "ownerInstitutionId" ? { ownerUserId: "" } : {}),
    }));
  };

  return (
    <div className="app-card !p-10 border-app-primary/10 shadow-2xl animate-in">
      <form className="space-y-10" onSubmit={onSubmit}>
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-3">
            <span className="app-label opacity-60">Cliente</span>
            <select
              value={formState.ownerInstitutionId}
              onChange={(event) =>
                updateForm("ownerInstitutionId", event.target.value)
              }
              className="app-select w-full rounded-2xl border border-app-border bg-app-bg px-5 py-4 text-sm font-bold text-app-text-main focus:border-app-primary focus:ring-2 focus:ring-app-primary/20 transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="">Seleccionar cliente...</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-3">
            <span className="app-label opacity-60">
              Responsable (opcional)
            </span>
            <select
              value={formState.ownerUserId}
              onChange={(event) => updateForm("ownerUserId", event.target.value)}
              disabled={!formState.ownerInstitutionId}
              className="app-select w-full rounded-2xl border border-app-border bg-app-bg px-5 py-4 text-sm font-bold text-app-text-main focus:border-app-primary outline-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {!formState.ownerInstitutionId
                  ? "Selecciona primero un cliente"
                  : "Sin responsable asignado"}
              </option>
              {therapistOptions.map((therapist) => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-3">
            <span className="app-label opacity-60">Cantidad de Vouchers</span>
            <input
              type="number"
              min="1"
              value={formState.quantity}
              onChange={(event) => updateForm("quantity", event.target.value)}
              className="w-full rounded-2xl border border-app-border bg-app-bg px-5 py-4 text-sm font-bold text-app-text-main focus:border-app-primary outline-none transition-all"
            />
          </label>

          <label className="flex flex-col gap-3">
            <span className="app-label opacity-60">Fecha de Expiración</span>
            <input
              type="date"
              value={formState.expiresAt}
              onChange={(event) => updateForm("expiresAt", event.target.value)}
              className="w-full rounded-2xl border border-app-border bg-app-bg px-5 py-4 text-sm font-bold text-app-text-main focus:border-app-primary outline-none transition-all"
            />
          </label>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-app-border pt-10 gap-6">
          <div className="flex-1">
            {errorMessage && (
              <div className="flex items-center gap-3 text-rose-500 bg-rose-500/5 px-6 py-4 rounded-2xl border border-rose-500/10">
                <span className="text-xs font-black uppercase tracking-widest">
                  {errorMessage}
                </span>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center gap-3 text-emerald-500 bg-emerald-500/5 px-6 py-4 rounded-2xl border border-emerald-500/10">
                <span className="text-xs font-black uppercase tracking-widest">
                  {successMessage}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto inline-flex items-center justify-center rounded-2xl bg-app-primary px-10 py-5 text-xs font-black uppercase tracking-[0.25em] text-white transition-all hover:bg-app-primary-hover hover:shadow-2xl hover:shadow-app-primary/30 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="mr-3 h-4 w-4" />
                Confirmar y emitir lote
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
