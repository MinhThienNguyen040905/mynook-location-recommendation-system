import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';

export interface Tag {
  id: string;
  key: string;
  display_name: string;
  category: string | null;
}

export interface TagsResponse {
  tags: Tag[];
  total: number;
}

export async function fetchTags(): Promise<TagsResponse> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TAGS.LIST}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}
