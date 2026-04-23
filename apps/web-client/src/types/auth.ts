export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  phone_number?: string;
  type?: 'customer' | 'owner';
}

export interface SendOtpRequest {
  email: string;
  password: string;
  full_name?: string;
  type?: 'customer' | 'owner';
}

export interface SendOtpResponse {
  message: string;
  dev_otp?: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  type: 'customer' | 'owner' | 'admin';
  trust_score: number;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface ForgotPasswordResponse {
  message: string;
  dev_reset_token?: string;
}
