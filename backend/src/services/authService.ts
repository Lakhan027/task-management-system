// src/services/authService.ts
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/jwt.js";
import redisHelpers from "../config/redis.js";

import {
  UserRegisterInput,
  UserLoginInput,
  UserResponse,
  LoginResponse,
} from "../types/auth.js";
import { IAuthService } from "./interfaces/auth-service.interface.js";
import {
  addSession,
  getAllSessionTokens,
  removeSession,
} from "./sessionService.js";

/**
 * Auth Service - Handles authentication business logic
 * Implements IAuthService interface
 */
class AuthService implements IAuthService {
  /**
   * Register a new user
   */
  async register(userData: UserRegisterInput): Promise<UserResponse> {
    const { name, email, password } = userData;

    // Validate input
    if (!name || !email || !password) {
      throw {
        statusCode: 400,
        message: "Name, email, and password are required",
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw {
        statusCode: 400,
        message: "Email already registered",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "user",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Login user
   */
  async login(credentials: UserLoginInput): Promise<LoginResponse> {
    const { email, password } = credentials;

    // Validate input
    if (!email || !password) {
      throw {
        statusCode: 400,
        message: "Email and password are required",
      };
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw {
        statusCode: 401,
        message: "Invalid credentials",
      };
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      throw {
        statusCode: 401,
        message: "Invalid credentials",
      };
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const decoded = jwt.decode(token) as { exp: number };
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    await addSession(user.id, token, expiresIn);

    // Cache user profile in Redis for faster access
    await redisHelpers.set(
      `user:${user.id}:profile`,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      3600, // Cache for 1 hour
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Logout - blacklist the token
   */
  async logout(token: string, userId: number): Promise<{ message: string }> {
    try {
      // Decode token to get expiration time
      const decoded = jwt.decode(token) as { exp: number };
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      // Store token in Redis blacklist with TTL until token expires
      const blacklistKey = `blacklist:${token}`;
      await redisHelpers.set(
        blacklistKey,
        { userId, reason: "logout" },
        expiresIn,
      );

      // Clear user session data from cache
      // await redisHelpers.deletePattern(`session:${userId}:*`);
      await removeSession(userId, token);
      await redisHelpers.delete(`user:${userId}:profile`);

      return { message: "Logged out successfully" };
    } catch (error) {
      console.error("Logout error:", error);
      // Even if Redis fails, logout is still successful
      return { message: "Logged out successfully" };
    }
  }

 /**
 * Logout from all devices
 */
async logoutAll(userId: number): Promise<{ message: string }> {
  try {
    // 1. Get all active session tokens for this user
    const tokens = await getAllSessionTokens(userId);

    // 2. Blacklist every active token
    // 2. Blacklist every active token — SAATH ME, sequential nahi
await Promise.all(
  tokens.map(async (token) => {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;

      if (!decoded?.exp) {
        return;   // ⚠️ 'continue' nahi — ab ye alag function hai, 'return' use hota hai
      }

      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      if (expiresIn > 0) {
        await redisHelpers.set(
          `blacklist:${token}`,
          { userId, reason: "logout_all" },
          expiresIn
        );
      }
    } catch (tokenError) {
      console.error("Failed to blacklist token:", tokenError);
    }
  })
);

   

    // 4. Remove cached user profile
    await redisHelpers.delete(
      `user:${userId}:profile`
    );

    return {
      message: "Logged out from all devices successfully",
    };
  } catch (error) {
  console.error("Logout all error:", error);
  return { message: "Logged out from all devices successfully" };   // 500 ki jagah
}
}

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistKey = `blacklist:${token}`;
    return await redisHelpers.exists(blacklistKey);
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(token: string): Promise<LoginResponse> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw {
          statusCode: 401,
          message: 'Token is blacklisted. Please login again.',
        };
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: number;
        email: string;
        role: string;
        iat: number;
        exp: number;
      };

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw {
          statusCode: 404,
          message: 'User not found',
        };
      }

      // Generate new token
      const newToken = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Blacklist the old token to prevent reuse
      const refreshExpiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      if (refreshExpiresIn > 0) {
        await redisHelpers.set(
          `blacklist:${token}`,
          { userId: user.id, reason: 'refreshed' },
          refreshExpiresIn
        );
      }

      return {
        token: newToken,
        user,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw {
          statusCode: 401,
          message: 'Invalid or expired token',
        };
      }
      throw error;
    }
  }

  /**
   * Cleanup expired tokens (can be called by cron job)
   */
  async cleanupExpiredTokens(): Promise<void> {
    // Redis automatically handles TTL, but we can clean up patterns if needed
    await redisHelpers.deletePattern("blacklist:*");
  }

  /**
   * Get Current User details
   */
  async getCurrentUser(userId: number): Promise<UserResponse> {
    // Try to get from cache first
    const cachedUser = await redisHelpers.get(`user:${userId}:profile`);
    if (cachedUser) {
      return cachedUser as UserResponse;
    }

    // If not in cache, get from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw {
        statusCode: 404,
        message: "User not found",
      };
    }

    // Cache for future requests
    await redisHelpers.set(`user:${userId}:profile`, user, 3600);

    return user;
  }

  /**
   * Change User Password
   */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Validate input
    if (!oldPassword || !newPassword) {
      throw {
        statusCode: 400,
        message: "Old password and new password are required",
      };
    }

    if (newPassword.length < 6) {
      throw {
        statusCode: 400,
        message: "New password must be at least 6 characters long",
      };
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw {
        statusCode: 404,
        message: "User not found",
      };
    }

    // Verify old password
    const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordCorrect) {
      throw {
        statusCode: 400,
        message: "Invalid old password",
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    // Clear cache
    await redisHelpers.delete(`user:${userId}:profile`);
    await redisHelpers.deletePattern(`session:${userId}:*`);

    return {
      message: "Password changed successfully",
    };
  }
}

// Export singleton instance
export default new AuthService();
