import { apiClient } from "../../../api/client";
import type { CategoryData, UpdateCategoryDto } from "@akit/contracts";

export type { CategoryData };

export async function fetchCategories(): Promise<CategoryData[]> {
  try {
    return await apiClient.get<CategoryData[]>("/categories");
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function updateCategory(
  categoryId: string,
  data: UpdateCategoryDto
): Promise<boolean> {
  try {
    await apiClient.put(`/categories/${categoryId}`, data);
    return true;
  } catch (error) {
    console.error("Error updating category:", error);
    return false;
  }
}
