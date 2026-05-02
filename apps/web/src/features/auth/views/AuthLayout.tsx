import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-bg p-4 text-app-text-main">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-44 -left-44 h-[30rem] w-[30rem] rounded-full bg-[#131a2f]/55 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[30rem] w-[30rem] rounded-full bg-[#1a2238]/45 blur-3xl" />
        <div className="app-tech-grid absolute inset-0 opacity-45" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="app-card p-8 sm:p-9 shadow-2xl backdrop-blur-xl rounded-2xl border border-app-border bg-app-surface">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-app-text-muted/80">
          © {new Date().getFullYear()} A.kit Platform · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
};