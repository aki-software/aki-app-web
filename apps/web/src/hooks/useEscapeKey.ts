import { useEffect } from "react";

export const useEscapeKey = (onEscape: () => void, disabled: boolean = false) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disabled) {
        onEscape();
      }
    };
    
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onEscape, disabled]);
};