import authService from '../services/authService.js';
/**
 * Auth Controller - Handles HTTP requests for authentication
 */
export const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const result = await authService.register({ name, email, password });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login({ email, password });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
export const getMe = async (req, res, next) => {
    try {
        // Get user from token (will be set by auth middleware)
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated',
            });
        }
        const user = await authService.getCurrentUser(userId);
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
};
export const changePassword = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { oldPassword, newPassword } = req.body;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated',
            });
        }
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Old password and new password are required',
            });
        }
        const result = await authService.changePassword(userId, oldPassword, newPassword);
        res.status(200).json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        next(error);
    }
};
