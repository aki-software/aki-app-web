import { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline";
}

export const Button = ({ children, isLoading, variant = "primary", className = "", ...props }: ButtonProps) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-95";
  
  const getVariantClasses = (v: string) => {
    switch(v) {
      case "primary": return "bg-app-primary text-white hover:bg-app-primary/90 shadow-md hover:shadow-lg hover:shadow-app-primary/20";
      case "secondary": return "bg-app-secondary text-white hover:bg-app-secondary/90 shadow-md";
      case "outline": return "bg-transparent text-app-text-main border-2 border-app-border hover:bg-app-surface hover:border-app-primary/30";
      default: return "bg-app-surface text-app-text-main border border-app-border hover:bg-app-bg";
    }
  };

  return (
    <button className={`${baseClasses} ${getVariantClasses(variant)} ${className}`} disabled={isLoading || props.disabled} {...props}>
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