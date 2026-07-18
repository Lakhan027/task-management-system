// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import authService from "../services/authService.js";

// ✅ Type definition for authenticated request
export interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
  };
}

/**
 * Get cookie value from cookie header
 */
const getCookieValue = (cookieHeader: string | undefined, name: string): string | undefined => {
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1]) : undefined;
};

/**
 * Authentication Middleware
 * Validates JWT token from Authorization header or cookie
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;
    const cookieToken = getCookieValue(req.headers.cookie, "token");
    const token = bearerToken || cookieToken;

    // 2. Check if token exists
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided",
      });
      return;
    }

    // 3. Check if token is blacklisted
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - Token has been invalidated",
      });
      return;
    }

    // 4. Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      email: string;
      role: string;
      iat: number;
      exp: number;
    };
    
    // ✅ Attach both user AND the raw token

    // 5. Attach user to request
    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };

     (req as any).token = token;

    next();
  } catch (error) {
    // Handle JWT specific errors
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid token",
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - Token expired",
      });
      return;
    }

    // Handle other errors
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

/**
 * ✅ Optional Authentication Middleware
 * Validates token if present, but doesn't block if not
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;
    const cookieToken = getCookieValue(req.headers.cookie, "token");
    const token = bearerToken || cookieToken;

    if (token) {
      try {
        const isBlacklisted = await authService.isTokenBlacklisted(token);
        if (!isBlacklisted) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            id: number;
            email: string;
            role: string;
          };
          (req as AuthRequest).user = decoded;
        }
      } catch {
        // If token is invalid, just continue without user
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ Role-based Authorization Middleware
 * @param roles - Array of allowed roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
      return;
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "Forbidden - Insufficient permissions",
      });
      return;
    }

    next();
  };
};

// ✅ Export all middleware functions
export default {
  authenticate,
  optionalAuthenticate,
  authorize,
};
