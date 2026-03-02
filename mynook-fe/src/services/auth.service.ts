import apiClient from './api.client';

export const authService = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (payload: { name: string; email: string; password: string }) =>
    apiClient.post('/auth/register', payload),
  logout: () => apiClient.post('/auth/logout'),
};
