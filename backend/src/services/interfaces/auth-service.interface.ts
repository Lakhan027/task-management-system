// src/services/interfaces/auth-service.interface.ts
import {
  UserRegisterInput,
  UserLoginInput,
  UserResponse,
  LoginResponse,
} from "../../types/auth.js";

/**
 * Auth Service Interface - Defines the contract for authentication services
 */
export interface IAuthService {
  /**
   * Register a new user
   * @param userData - User registration data (name, email, password)
   * @returns Created user without password
   */
  register(userData: UserRegisterInput): Promise<UserResponse>;

  /**
   * Login user
   * @param credentials - User login credentials (email, password)
   * @returns JWT token and user data
   */
  login(credentials: UserLoginInput): Promise<LoginResponse>;

  /**
   * Logout - blacklist the token
   * @param token - JWT token to blacklist
   * @param userId - User ID for session cleanup
   * @returns Success message
   */
  logout(token: string, userId: number): Promise<{ message: string }>;

  /**
   * Logout from all devices
   * @param userId - User ID to clear all sessions
   * @returns Success message
   */
  logoutAll(userId: number): Promise<{ message: string }>;

  /**
   * Check if token is blacklisted
   * @param token - JWT token to check
   * @returns True if blacklisted, false otherwise
   */
  isTokenBlacklisted(token: string): Promise<boolean>;

  /**
   * Refresh JWT token
   * @param token - Valid JWT token
   * @returns New JWT token and user data
   */
  refreshToken(token: string): Promise<LoginResponse>;

  /**
   * Get Current User details
   * @param userId - User ID
   * @returns User profile without password
   */
  getCurrentUser(userId: number): Promise<UserResponse>;

  /**
   * Change User Password
   * @param userId - User ID
   * @param oldPassword - Current password
   * @param newPassword - New password
   * @returns Success message
   */
  changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<{ message: string }>;

  /**
   * Cleanup expired tokens (can be called by cron job)
   */
  cleanupExpiredTokens(): Promise<void>;
}