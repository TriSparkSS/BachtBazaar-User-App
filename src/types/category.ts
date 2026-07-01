export type CategoryType = 'product' | 'service' | string;

export interface Category {
  id: string;
  value: string;
  label: string;
  description?: string;
  image?: string;
  type: CategoryType;
}
