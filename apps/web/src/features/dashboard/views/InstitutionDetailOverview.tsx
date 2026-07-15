import { ArrowLeft, Building2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { Spinner } from "../../../components/atoms/Spinner";
import { Alert } from "../../../components/atoms/Alert";
import { Button } from "../../../components/atoms/Button";
import { StatCard } from "../../../components/atoms/StatCard";
import { useInstitutionDetailManager } from "../hooks/useInstitutionDetailManager";

type LocationState = {
  institutionName?: string;
};

export function InstitutionDetailOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  // Protección de ruta: solo ADMIN puede acceder
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, navigate]);

  const state = (location.state ?? {}) as LocationState;
  const institutionName = state.institutionName;

  // Delegamos toda la lógica al hook base
  const { loading, error, data } = useInstitutionDetailManager(id);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <Spinner size="lg" className="border-app-primary" />
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
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
        <Alert type="error" message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] font-semibold text-app-text-muted/50 uppercase tracking-[0.15em]">
        <button onClick={() => navigate('/dashboard/users')} className="hover:text-app-primary transition-colors">Admin</button>
        <span className="opacity-30">/</span>
        <span className="hover:text-app-primary transition-colors">Instituciones</span>
        <span className="opacity-30">/</span>
        <span className="text-app-text-muted/80 truncate max-w-[250px]">{institutionName ?? id}</span>
      </div>

      {/* HEADER */}
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

          <Button variant="outline" onClick={() => navigate("/dashboard/users")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a lista
          </Button>
        </div>

        <p className="text-sm font-medium text-app-text-muted">
          Overview operativo (últimos {data?.periodDays ?? 7} días).
        </p>
      </div>

      {/* GRID DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vouchers disponibles"
          value={data?.vouchers.available ?? 0}
          description={`Total emitidos: ${data?.vouchers.total ?? 0}`}
          valueColor="text-status-success"
        />
        <StatCard
          label="Vouchers canjeados"
          value={data?.vouchers.vouchersRedeemedPeriod ?? 0}
          description={`Tasa: ${data?.vouchers.voucherRedemptionRatePeriod ?? 0}%`}
        />
        <StatCard
          label="Tests iniciados"
          value={data?.tests.testsStartedPeriod ?? 0}
        />
        <StatCard
          label="Tests completados"
          value={data?.tests.testsCompletedPeriod ?? 0}
        />
      </div>
    </div>
  );
}
