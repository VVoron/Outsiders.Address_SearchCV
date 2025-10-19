export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  re_password: string;
}

export interface TokenResponse {
  access: string;
  refresh?: string;
}

export interface MeResponse {
  id: number;
  email: string;
  username: string;
}
