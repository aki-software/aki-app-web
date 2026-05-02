import { useState, useEffect } from "react";
import { fetchInstitutionOverview, type InstitutionOverviewResponse } from "../api/dashboard";

export const useInstitutionDetailManager = (id?: string) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InstitutionOverviewResponse | null>(null);

  useEffect(() => {
    let isActive = true;
    
    const loadOverview = async () => {
      if (!id) {
        setError("Institución inválida.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      const res = await fetchInstitutionOverview({ institutionId: id, days: 7 });
      
      if (!isActive) return;

      if (!res) {
        setError("No se pudo cargar el overview de la institución.");
        setData(null);
      } else {
        setData(res);
      }
      
      setLoading(false);
    };

    void loadOverview();
    
    return () => { isActive = false; };
  }, [id]);

  return { loading, error, data };
};