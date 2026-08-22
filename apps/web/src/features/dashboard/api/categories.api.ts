import { apiClient } from "../../../api/client";
import type { CategoryData } from "@akit/contracts";

export type { CategoryData };

export type CategoryUpdatePayload = Partial<Omit<CategoryData, "categoryId">>;

export async function updateCategory(
  categoryId: string,
  payload: CategoryUpdatePayload,
): Promise<CategoryData> {
  return apiClient.put<CategoryData>(`/categories/${categoryId}`, payload);
}

export async function fetchCategories(): Promise<CategoryData[]> {
  try {
    return await apiClient.get<CategoryData[]>("/categories");
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}
