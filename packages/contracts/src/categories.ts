export interface CategoryData {
  categoryId: string;
  title: string;
  description: string;
  occupations: string[];
  formalProfessions: string[];
  competencies: string[];
}

export type CategoryResponse = CategoryData;

export interface CategoryMaterialItemResponse {
  id: string;
  title: string;
  url: string;
  type: string;
}

export interface CategoryMaterialListResponse {
  categoryId: string;
  materials: CategoryMaterialItemResponse[];
}

export interface UpdateCategoryDto {
  title?: string;
  description?: string;
  occupations?: string[];
  formalProfessions?: string[];
  competencies?: string[];
}
