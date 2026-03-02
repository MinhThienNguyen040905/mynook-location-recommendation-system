import apiClient from './api.client';

export const venueService = {
  getAll: () => apiClient.get('/venues'),
  getById: (id: string) => apiClient.get(`/venues/${id}`),
  search: (query: string) => apiClient.get('/search', { params: { q: query } }),
};
