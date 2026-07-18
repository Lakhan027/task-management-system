export class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
export const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);
    // Handle Prisma errors
    if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
        handlePrismaError(err, res);
        return;
    }
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    // ✅ Standardized error response
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
const handlePrismaError = (err, res) => {
    const errorMap = {
        P2002: { status: 409, message: 'Duplicate entry' },
        P2025: { status: 404, message: 'Record not found' },
        P2014: { status: 400, message: 'Invalid relation' },
        P2003: { status: 400, message: 'Foreign key constraint failed' },
    };
    const error = errorMap[err.code] || { status: 500, message: 'Database error' };
    // ✅ Standardized error response
    res.status(error.status).json({
        success: false,
        message: error.message,
        code: err.code,
    });
};
export const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
};
