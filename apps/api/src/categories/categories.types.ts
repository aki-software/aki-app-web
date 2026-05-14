export type CategoryResponse = {
  categoryId: string;
  title: string;
  description: string;
};

export type CategoryMaterialItemResponse = {
  categoryId: string;
  title: string;
  text: string;
};

export type CategoryMaterialListResponse = {
  items: CategoryMaterialItemResponse[];
};
