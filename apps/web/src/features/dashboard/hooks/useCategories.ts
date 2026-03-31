import { useEffect, useState } from "react";
import { fetchCategories, type CategoryData } from "../api/dashboard";

let cachedCategories: Record<string, CategoryData> | null = null;
let fetchPromise: Promise<Record<string, CategoryData>> | null = null;

export function useCategories() {
  const [categoriesMap, setCategoriesMap] = useState<Record<string, CategoryData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cachedCategories) {
      setCategoriesMap(cachedCategories);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchCategories().then((data) => {
        const map: Record<string, CategoryData> = {};
        for (const cat of data) {
          map[cat.categoryId.toUpperCase()] = cat;
        }
        cachedCategories = map;
        return map;
      });
    }

    fetchPromise.then((map) => {
      setCategoriesMap(map);
      setLoading(false);
    });
  }, []);

  return { categoriesMap, loading };
}
