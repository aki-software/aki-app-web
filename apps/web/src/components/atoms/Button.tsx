import { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline";
}

export const Button = ({ children, isLoading, variant = "primary", className = "", ...props }: ButtonProps) => {
  // Aquí puedes mapear las clases base de tu app-button según la variante
  const baseClasses = "mt-2 flex w-full items-center justify-center gap-2 py-3 rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-50";
  const variantClasses = variant === "primary" ? "bg-app-primary text-white hover:bg-app-primary/90" : "bg-app-surface text-app-text-main border border-app-border";

  return (
    <button className={`${baseClasses} ${variantClasses} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? (
        <>
          <Spinner size="sm" className="border-white" />
          <span>Procesando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};