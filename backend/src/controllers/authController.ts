// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService.js';

class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = req.body;

      const result = await authService.register({ name, email, password,  });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      const result = await authService.login({ email, password });

      this.setAuthCookie(res, result.token);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh JWT token
   * POST /api/auth/refresh-token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'No token provided',
        });
        return;
      }

      const result = await authService.refreshToken(token);

      this.setAuthCookie(res, result.token);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user - clear cookie and blacklist token
   * POST /api/auth/logout
   */
 logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = (req as any).token;   // ✅ use attached token
    const userId = req.user?.id;

    if (!token || !userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated or token missing',
      });
      return;
    }

    await authService.logout(token, userId);
    this.clearAuthCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

  /**
   * Logout from all devices - clear all sessions
   * POST /api/auth/logout-all
   */
  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      await authService.logoutAll(userId);
      this.clearAuthCookie(res);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const user = await authService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        message: 'User fetched successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change user password
   * POST /api/auth/change-password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { oldPassword, newPassword } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      if (!oldPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Old password and new password are required',
        });
        return;
      }

      const result = await authService.changePassword(userId, oldPassword, newPassword);

      res.status(200).json({
        success: true,
        message: result.message,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== PRIVATE HELPERS ====================

private setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // For development on localhost: secure false, lax works if using proxy.
  // For production (HTTPS): secure true, none for cross-site.
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction, // false in development (http)
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    // If you really need cross-origin in dev, you'll need to handle it differently
    // and likely use a proxy, because http + sameSite=none is blocked by browsers.
  });
}

  private clearAuthCookie(res: Response): void {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
  }

  private getCookieValue(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const cookie = cookies.find((item) => item.startsWith(`${name}=`));

    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
  }

  private extractToken(req: Request): string | null {
    return this.getCookieValue(req.headers.cookie, 'token') || req.headers.authorization?.split(' ')[1] || null;
  }
}

export default new AuthController();
