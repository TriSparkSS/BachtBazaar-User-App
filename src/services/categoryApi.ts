import { API_ENDPOINTS, resolveProfileImageUrl, SHOPS_API_BASE_URL } from '../config/api';
import { Category } from '../types/category';
import { apiRequest } from './apiClient';
import { parseCategoriesResponse } from './categoryResponseParser';

export const categoryApi = {
  fetchCategories(token?: string): Promise<Category[]> {
    return apiRequest<unknown>(API_ENDPOINTS.categories, {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(parseCategoriesResponse);
  },

  resolveImageUrl: resolveProfileImageUrl,
};
