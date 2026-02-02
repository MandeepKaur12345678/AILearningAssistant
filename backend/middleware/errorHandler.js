/**
 * Global Error Handler Middleware
 * Handles all errors in a structured way
 */

const errorHandler = (err, req, res, next) => {
    // Default error structure
    let error = { ...err };
    error.message = err.message;
    
    // Log error for development
    console.error('❌ Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        timestamp: new Date().toISOString()
    });
    
    // Mongoose Bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found with id: ${err.value}`;
        error = {
            success: false,
            message: message,
            statusCode: 404
        };
    }
    
    // Mongoose Duplicate Key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        const message = `Duplicate field value: ${value}. Please use another ${field}`;
        error = {
            success: false,
            message: message,
            statusCode: 400
        };
    }
    
    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = {
            success: false,
            message: message,
            statusCode: 400
        };
    }
    
    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
        error = {
            success: false,
            message: 'Invalid token. Please login again',
            statusCode: 401
        };
    }
    
    if (err.name === 'TokenExpiredError') {
        error = {
            success: false,
            message: 'Token expired. Please login again',
            statusCode: 401
        };
    }
    
    // Default error response
    const statusCode = error.statusCode || err.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    
    res.status(statusCode).json({
        success: false,
        error: message,
        statusCode: statusCode,
        // Include stack trace only in development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

export default errorHandler;