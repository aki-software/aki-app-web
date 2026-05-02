import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "../context/theme.context";

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error("useTheme debe usarse dentro de un <ThemeProvider>");
  }
  
  return context;
}