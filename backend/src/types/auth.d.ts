export interface UserRegisterInput {
  name?: string;
  email?: string;
  password?: string;
}

export interface UserLoginInput {
  email?: string;
  password?: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

export interface JwtPayload {
  id: number;
  email: string;
}