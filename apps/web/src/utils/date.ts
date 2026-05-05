export function toReadableTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function getFormattedCurrentDate(): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
};

export function formatDateTime(value: string | Date | number | null | undefined): string {
  if (!value) return "Sin dato";
  
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sin dato";
  
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatDate = (val: string | number | Date | null | undefined): string => { 
  if (!val) return "—";
  const d = new Date(val); 
  return isNaN(d.getTime()) 
    ? "—" 
    : new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" }).format(d); 
};

export const formatDuration = (ms: number | null | undefined): string => { 
  if (ms == null) return "—";
  const m = Math.floor(ms / 60000); 
  const s = Math.floor((ms % 60000) / 1000); 
  return m === 0 ? `${s}s` : `${m}m ${s}s`; 
};

// src/utils/date.ts (agregá esto a lo que ya tenías)

export const toRelativeTimestamp = (isoDate: string): string => {
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getUTCFullYear() <= 1971) {
    return "fecha no disponible";
  }

  const elapsedMs = Date.now() - parsedDate.getTime();

  // Si la fecha está en el futuro por desincronización de zona horaria
  if (elapsedMs < 0) return toAbsoluteTimestamp(isoDate);
  if (elapsedMs < 5_000) return "justo ahora";
  
  if (elapsedMs < 60_000) {
    const seconds = Math.max(1, Math.floor(elapsedMs / 1000));
    return `hace ${seconds} s`;
  }

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  return `hace ${days} día(s)`;
};

export const toAbsoluteTimestamp = (isoDate: string): string => {
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getUTCFullYear() <= 1971) {
    return "Fecha no disponible";
  }

  return parsedDate.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};