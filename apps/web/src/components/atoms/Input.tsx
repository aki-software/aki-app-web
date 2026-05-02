import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const currentType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-sm font-medium text-app-text-muted">
            {label}
          </label>
          {hint && <span className="text-xs text-app-text-muted/80">{hint}</span>}
        </div>

        <div className="relative">
          <input
            id={id}
            ref={ref}
            type={currentType}
            className={`w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text-main placeholder:text-app-text-muted/80 outline-none transition-all duration-200 focus:border-app-primary focus:ring-2 focus:ring-app-primary/25 disabled:opacity-50 ${
              isPassword ? "pr-12" : ""
            } ${className} ${error ? "border-red-500 focus:ring-red-500/25" : ""}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-app-text-muted transition-colors hover:text-app-text-main"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";