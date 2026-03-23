export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'owner';
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'owner' | 'admin';
  avatar_url?: string;
}
