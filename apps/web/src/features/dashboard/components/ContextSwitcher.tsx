import { useAuth } from "../../auth/hooks/useAuth";
import { ChevronDown, Building2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export const ContextSwitcher = () => {
  const { user, activeInstitutionId, setActiveInstitutionId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const institutions = user?.userInstitutions?.map((ui) => ui.institution) || [];
  
  const activeInstitution = institutions.find(
    (inst) => inst?.id === activeInstitutionId
  ) || institutions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (institutions.length <= 1) {
    return null; // Don't show switcher if the user only belongs to 1 (or 0) institutions
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-app-surface/50 border border-app-border hover:bg-app-surface transition-colors"
      >
        <Building2 className="w-4 h-4 text-app-primary" />
        <span className="text-sm font-medium text-app-text-main max-w-[120px] truncate">
          {activeInstitution?.name || "Seleccionar Institución"}
        </span>
        <ChevronDown className={`w-4 h-4 text-app-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-app-surface border border-app-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 text-xs font-semibold text-app-text-muted uppercase tracking-wider border-b border-app-border bg-app-surface/50">
            Cambiar contexto
          </div>
          <div className="max-h-64 overflow-y-auto">
            {institutions.map((inst) => (
              <button
                key={inst?.id}
                onClick={() => {
                  if (inst?.id) {
                    setActiveInstitutionId(inst.id);
                  }
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center space-x-2 hover:bg-app-surface-hover ${
                  activeInstitutionId === inst?.id 
                    ? "text-app-primary font-medium bg-app-surface-hover/50" 
                    : "text-app-text-main"
                }`}
              >
                <span className="truncate">{inst?.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
