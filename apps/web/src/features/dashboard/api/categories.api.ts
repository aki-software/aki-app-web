import { apiClient } from "../../../api/client";
import type { CategoryData } from "@akit/contracts";

export type { CategoryData };

export async function fetchCategories(): Promise<CategoryData[]> {
  try {
    return await apiClient.get<CategoryData[]>("/categories");
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}
