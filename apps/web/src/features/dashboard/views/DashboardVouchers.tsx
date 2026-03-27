import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  KeyRound,
  Layers3,
  Plus,
  Search,
  Ticket,
  UserRound,
} from "lucide-react";
import {
  createVoucher,
  fetchInstitutions,
  fetchTherapists,
  fetchVouchersList,
  type InstitutionOption,
  type TherapistOption,
  type VoucherData,
} from "../api/dashboard";

function formatDate(value: string | number | Date | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function statusLabel(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "Disponible";
    case "USED":
      return "Usado";
    case "SENT":
      return "Enviado";
    case "EXPIRED":
      return "Expirado";
    case "REVOKED":
      return "Revocado";
    default:
      return status;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900";
    case "USED":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900";
    case "EXPIRED":
    case "REVOKED":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900";
  }
}

type OwnerType = "INSTITUTION" | "THERAPIST";

type VoucherFormState = {
  ownerType: OwnerType;
  ownerInstitutionId: string;
  ownerUserId: string;
  quantity: string;
  expiresAt: string;
};

type BatchSummary = {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: string | number | Date;
  expiresAt: string | number | Date | null;
  total: number;
  available: number;
  used: number;
};

const initialFormState: VoucherFormState = {
  ownerType: "INSTITUTION",
  ownerInstitutionId: "",
  ownerUserId: "",
  quantity: "1",
  expiresAt: "",
};

export function DashboardVouchers() {
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<VoucherFormState>(initialFormState);

  const loadData = async () => {
    const [voucherData, institutionsData, therapistsData] = await Promise.all([
      fetchVouchersList(),
      fetchInstitutions(),
      fetchTherapists(),
    ]);
    setVouchers(voucherData);
    setInstitutions(institutionsData);
    setTherapists(therapistsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVouchers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return vouchers;

    return vouchers.filter((voucher) =>
      [
        voucher.code,
        voucher.status,
        voucher.batchId,
        voucher.ownerInstitutionName,
        voucher.ownerUserName,
        voucher.assignedPatientName,
        voucher.assignedPatientEmail,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [searchTerm, vouchers]);

  const batchSummaries = useMemo<BatchSummary[]>(() => {
    const grouped = new Map<string, BatchSummary>();

    filteredVouchers.forEach((voucher) => {
      const existing = grouped.get(voucher.batchId);
      if (!existing) {
        grouped.set(voucher.batchId, {
          batchId: voucher.batchId,
          ownerInstitutionName: voucher.ownerInstitutionName,
          ownerUserName: voucher.ownerUserName,
          createdAt: voucher.createdAt,
          expiresAt: voucher.expiresAt,
          total: 1,
          available: voucher.status === "AVAILABLE" ? 1 : 0,
          used: voucher.status === "USED" ? 1 : 0,
        });
        return;
      }

      existing.total += 1;
      if (voucher.status === "AVAILABLE") existing.available += 1;
      if (voucher.status === "USED") existing.used += 1;
    });

    return Array.from(grouped.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredVouchers]);

  const availableCount = filteredVouchers.filter(
    (voucher) => voucher.status === "AVAILABLE"
  ).length;
  const usedCount = filteredVouchers.filter(
    (voucher) => voucher.status === "USED"
  ).length;

  const therapistOptions = useMemo(() => {
    if (formState.ownerType !== "THERAPIST") return therapists;

    return therapists.filter((therapist) =>
      formState.ownerInstitutionId
        ? therapist.institutionId === formState.ownerInstitutionId
        : true
    );
  }, [formState.ownerInstitutionId, formState.ownerType, therapists]);

  const updateForm = (field: keyof VoucherFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleOwnerTypeChange = (value: OwnerType) => {
    resetMessages();
    setFormState((prev) => ({
      ...prev,
      ownerType: value,
      ownerInstitutionId: "",
      ownerUserId: "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (
      formState.ownerType === "INSTITUTION" &&
      !formState.ownerInstitutionId.trim()
    ) {
      setErrorMessage("Seleccioná una institución para emitir el lote.");
      return;
    }

    if (formState.ownerType === "THERAPIST" && !formState.ownerUserId.trim()) {
      setErrorMessage("Seleccioná un terapeuta para emitir el lote.");
      return;
    }

    setSaving(true);

    const created = await createVoucher({
      ownerType: formState.ownerType,
      ownerInstitutionId:
        formState.ownerType === "INSTITUTION"
          ? formState.ownerInstitutionId
          : undefined,
      ownerUserId:
        formState.ownerType === "THERAPIST" ? formState.ownerUserId : undefined,
      quantity: Number(formState.quantity || "1"),
      expiresAt: formState.expiresAt || undefined,
    });

    setSaving(false);

    if (!created) {
      setErrorMessage("No se pudo crear el lote de vouchers.");
      return;
    }

    await loadData();
    setFormState(initialFormState);
    setShowCreateForm(false);
    setSuccessMessage(
      `Lote ${created.batchId.slice(0, 8)} emitido con ${created.createdCount} voucher${created.createdCount === 1 ? "" : "s"}.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vouchers
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            El admin emite lotes para una institución o terapeuta. Después cada
            owner distribuye esos vouchers a sus pacientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              resetMessages();
              setShowCreateForm((prev) => !prev);
            }}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showCreateForm ? "Cerrar alta" : "Emitir lote"}
          </button>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Vouchers
              </div>
              <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                {filteredVouchers.length}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Lotes
              </div>
              <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                {batchSummaries.length}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20">
              <div className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Disponibles
              </div>
              <div className="mt-1 text-xl font-semibold text-emerald-800 dark:text-emerald-200">
                {availableCount}
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
              <div className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Usados
              </div>
              <div className="mt-1 text-xl font-semibold text-blue-800 dark:text-blue-200">
                {usedCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreateForm ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  Tipo de owner
                </span>
                <select
                  value={formState.ownerType}
                  onChange={(event) =>
                    handleOwnerTypeChange(event.target.value as OwnerType)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="INSTITUTION">Institución</option>
                  <option value="THERAPIST">Terapeuta</option>
                </select>
              </label>

              {formState.ownerType === "INSTITUTION" ? (
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Institución
                  </span>
                  <select
                    value={formState.ownerInstitutionId}
                    onChange={(event) =>
                      updateForm("ownerInstitutionId", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Seleccionar institución</option>
                    {institutions.map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Terapeuta
                  </span>
                  <select
                    value={formState.ownerUserId}
                    onChange={(event) =>
                      updateForm("ownerUserId", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Seleccionar terapeuta</option>
                    {therapistOptions.map((therapist) => (
                      <option key={therapist.id} value={therapist.id}>
                        {therapist.name}
                        {therapist.institutionName
                          ? ` · ${therapist.institutionName}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="space-y-1 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  Cantidad
                </span>
                <input
                  type="number"
                  min="1"
                  value={formState.quantity}
                  onChange={(event) => updateForm("quantity", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  Expira el
                </span>
                <input
                  type="date"
                  value={formState.expiresAt}
                  onChange={(event) => updateForm("expiresAt", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
            </div>

            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                {saving ? "Emitiendo..." : "Emitir lote"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por lote, código, institución o paciente..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center px-6 text-center text-gray-500 dark:text-gray-400">
            <Ticket className="mb-4 h-10 w-10 opacity-20" />
            <p>No hay vouchers para mostrar con el filtro actual.</p>
          </div>
        ) : (
          <div className="space-y-6 p-5">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Lotes emitidos
                </h3>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {batchSummaries.map((batch) => (
                  <div
                    key={batch.batchId}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                          Lote {batch.batchId.slice(0, 8)}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {batch.ownerInstitutionName}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Responsable: {batch.ownerUserName}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                        <div>Emitido: {formatDate(batch.createdAt)}</div>
                        <div>Expira: {formatDate(batch.expiresAt)}</div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center dark:border-gray-700 dark:bg-gray-800">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Total
                        </div>
                        <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                          {batch.total}
                        </div>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
                        <div className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                          Disponibles
                        </div>
                        <div className="mt-1 text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                          {batch.available}
                        </div>
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center dark:border-blue-900 dark:bg-blue-950/20">
                        <div className="text-[11px] uppercase tracking-wide text-blue-700 dark:text-blue-300">
                          Usados
                        </div>
                        <div className="mt-1 text-lg font-semibold text-blue-800 dark:text-blue-200">
                          {batch.used}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Voucher
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Lote y owner
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Paciente
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Fechas clave
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {filteredVouchers.map((voucher) => (
                    <tr key={voucher.id} className="align-top">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <KeyRound className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                              {voucher.code}
                            </div>
                            <div
                              className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                                voucher.status
                              )}`}
                            >
                              {statusLabel(voucher.status)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            Lote {voucher.batchId.slice(0, 8)}
                          </div>
                          <div className="flex items-start gap-3">
                            <Building2 className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {voucher.ownerInstitutionName}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <UserRound className="h-3.5 w-3.5" />
                                Responsable: {voucher.ownerUserName}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {voucher.assignedPatientName || voucher.assignedPatientEmail ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {voucher.assignedPatientName ?? "Paciente no informado"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {voucher.assignedPatientEmail ?? "Sin email asociado"}
                            </div>
                            {voucher.redeemedSessionId ? (
                              <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                                <BadgeCheck className="h-3.5 w-3.5" />
                                Sesión vinculada
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            No asignado todavía
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              Creado:
                            </span>{" "}
                            {formatDate(voucher.createdAt)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              Usado:
                            </span>{" "}
                            {formatDate(voucher.redeemedAt)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              Expira:
                            </span>{" "}
                            {formatDate(voucher.expiresAt)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
