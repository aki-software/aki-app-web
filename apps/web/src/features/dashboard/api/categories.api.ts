import { API_URL, getAuthHeaders } from "./client";

export interface CategoryData {
  categoryId: string;
  title: string;
  description: string;
}

export async function fetchCategories(): Promise<CategoryData[]> {
  try {
    const response = await fetch(`${API_URL}/categories`);
    if (!response.ok) throw new Error("Failed to fetch categories");
    return (await response.json()) as CategoryData[];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function updateCategory(
  categoryId: string,
  data: { title: string; description: string }
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/categories/${categoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating category:", error);
    return false;
  }
}
