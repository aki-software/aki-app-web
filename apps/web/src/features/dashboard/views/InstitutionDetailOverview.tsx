import { ArrowLeft, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchInstitutionOverview } from "../api/dashboard";

type LocationState = {
  institutionName?: string;
};

export function InstitutionDetailOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const state = (location.state ?? {}) as LocationState;
  const institutionName = state.institutionName;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchInstitutionOverview>
  > | null>(null);

  useEffect(() => {
    let isActive = true;
    const run = async () => {
      if (!id) {
        setError("Institución inválida.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const res = await fetchInstitutionOverview({ institutionId: id, days: 7 });
      if (!isActive) return;

      if (!res) {
        setError("No se pudo cargar el overview de la institución.");
        setData(null);
      } else {
        setData(res);
      }
      setLoading(false);
    };

    void run();
    return () => {
      isActive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-app-primary border-t-transparent" />
        <span className="app-label !text-xs tracking-[0.25em] animate-pulse">
          Cargando overview
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center rounded-2xl border border-app-border bg-app-surface px-5 py-3 text-xs font-black uppercase tracking-widest text-app-text-main shadow-sm transition-all hover:border-app-primary hover:text-app-primary"
          >
            <ArrowLeft className="mr-3 h-4 w-4" />
            Volver
          </button>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-5 text-sm font-semibold text-rose-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in">
      <div className="flex flex-col gap-4 border-b border-app-border pb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-app-primary" />
            <div>
              <p className="app-label opacity-60">Institución</p>
              <h2 className="text-2xl font-black text-app-text-main tracking-tight">
                {institutionName ?? id}
              </h2>
            </div>
          </div>

          <Link
            to="/dashboard/users"
            className="inline-flex items-center justify-center rounded-2xl border border-app-border bg-app-surface px-5 py-3 text-xs font-black uppercase tracking-widest text-app-text-main shadow-sm transition-all hover:border-app-primary hover:text-app-primary"
          >
            <ArrowLeft className="mr-3 h-4 w-4" />
            Volver a lista
          </Link>
        </div>

        <p className="text-sm font-medium text-app-text-muted">
          Overview operativo (últimos {data?.periodDays ?? 7} días).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="app-card py-5 px-6">
          <p className="app-label opacity-50">Vouchers disponibles</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-emerald-200">
            {data?.vouchers.available ?? 0}
          </p>
          <p className="mt-2 text-xs text-app-text-muted">
            Total emitidos: {data?.vouchers.total ?? 0}
          </p>
        </div>
        <div className="app-card py-5 px-6">
          <p className="app-label opacity-50">Vouchers canjeados</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-app-text-main">
            {data?.vouchers.vouchersRedeemedPeriod ?? 0}
          </p>
          <p className="mt-2 text-xs text-app-text-muted">
            Tasa: {data?.vouchers.voucherRedemptionRatePeriod ?? 0}%
          </p>
        </div>
        <div className="app-card py-5 px-6">
          <p className="app-label opacity-50">Tests iniciados</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-app-text-main">
            {data?.tests.testsStartedPeriod ?? 0}
          </p>
        </div>
        <div className="app-card py-5 px-6">
          <p className="app-label opacity-50">Tests completados</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-app-text-main">
            {data?.tests.testsCompletedPeriod ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
