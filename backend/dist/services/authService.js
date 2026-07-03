// src/services/authService.ts
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.js";
/**
 * Auth Service - Simple register and login
 */
class AuthService {
    /**
     * Register a new user
     */
    async register(userData) {
        const { name, email, password } = userData;
        if (!name || !email || !password) {
            throw {
                statusCode: 400,
                message: "Name, email, and password are required",
            };
        }
        // 1. Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw {
                statusCode: 400,
                message: "Email already registered",
            };
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        // 2. Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
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
        if (!email || !password) {
            throw {
                statusCode: 400,
                message: "Email and password are required",
            };
        }
        // 1. Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw {
                statusCode: 401,
                message: "Invalid credentials",
            };
        }
        // 2. Check password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            throw {
                statusCode: 401,
                message: "Invalid credentials",
            };
        }
        const token = generateToken({
            id: user.id,
            email: user.email,
        });
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
            },
        };
    }
    /**
     * Get Current User details
     */
    async getCurrentUser(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw {
                statusCode: 404,
                message: "User not found",
            };
        }
        return user;
    }
    /**
     * Change User Password
     */
    async changePassword(userId, oldPassword, newPassword) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw {
                statusCode: 404,
                message: "User not found",
            };
        }
        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordCorrect) {
            throw {
                statusCode: 400,
                message: "Invalid old password",
            };
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });
        return {
            message: "Password changed successfully",
        };
    }
}
export default new AuthService();
