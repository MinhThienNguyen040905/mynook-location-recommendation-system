import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token
apiClient.interceptors.request.use((config) => {
  // TODO: attach JWT from store/cookie
  return config;
});

// Response interceptor — handle global errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: handle 401, refresh token, etc.
    return Promise.reject(error);
  },
);

export default apiClient;
