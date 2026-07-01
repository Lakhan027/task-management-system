// src/services/authService.js
import prisma from '../config/prisma.js';

/**
 * Auth Service - Simple register and login (no JWT)
 */
class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { name, email, password } = userData;

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw {
        statusCode: 400,
        message: 'Email already registered',
      };
    }

    // 2. Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // In production: hash this!
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Login user
   */
  async login(credentials) {
    const { email, password } = credentials;

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw {
        statusCode: 401,
        message: 'Invalid credentials',
      };
    }

    // 2. Check password (simple comparison - no hashing)
    if (user.password !== password) {
      throw {
        statusCode: 401,
        message: 'Invalid credentials',
      };
    }

    // 3. Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }
}

export default new AuthService();