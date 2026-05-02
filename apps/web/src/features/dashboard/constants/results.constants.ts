export type StatusFilter = "ALL" | "STARTED" | "COMPLETED" | "REPORT_UNLOCKED";

export const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Todos los estados" },
  { value: "STARTED", label: "Iniciados" },
  { value: "COMPLETED", label: "Completados" },
  { value: "REPORT_UNLOCKED", label: "Informe desbloqueado" },
];

export const RESULTS_UI_TEXTS = {
  header: {
    title: "Pacientes y Tests",
    subtitleInstitution: "Supervisión técnica de los procesos vocacionales realizados por tus pacientes.",
    subtitleAdmin: "Consolidado global de actividad: incluye pago individual, terapeutas y organizaciones.",
  },
  metrics: {
    patients: "Pacientes",
    tests: "Tests Totales",
  },
  emptyState: "No se detectaron coincidencias",
  tableHeaders: ["Usuario / Paciente", "Tests", "Última Actividad"],
};