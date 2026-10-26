import { ENV } from '../config/env.js';

export const notFound = (req, res, next) => {
  const error = new Error(`Resource endpoint not found: ${req.method} ${req.originalUrl}`);
  error.code = 'NOT_FOUND';
  error.status = 404;
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'An unexpected internal server error occurred.';
  let code = err.code || 'INTERNAL_ERROR';
  let errors = err.errors || null;

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY_CONFLICT';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid ${err.path}: '${err.value}' is not a valid format.`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = errors.length
      ? `Data validation failed: ${errors.map((e) => e.message).join(', ')}`
      : 'Data validation failed.';
  }

  // Handle JWT Error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Authentication token is invalid.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(errors && { errors }),
    ...(ENV.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
