import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ValidationError } from 'express-validator'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
  })

  // Default error response
  let statusCode = 500
  let message = 'Internal server error'

  // Handle known error types
  if ('statusCode' in error && error.statusCode) {
    statusCode = error.statusCode
    message = error.message
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409
        message = 'A record with this information already exists'
        break
      case 'P2014':
        statusCode = 400
        message = 'Invalid data provided'
        break
      case 'P2003':
        statusCode = 400
        message = 'Invalid reference to related record'
        break
      case 'P2025':
        statusCode = 404
        message = 'Record not found'
        break
      default:
        statusCode = 400
        message = 'Database operation failed'
    }
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400
    message = 'Invalid data provided'
  }

  // Express validator errors
  if (Array.isArray(error) && error[0] && 'msg' in error[0]) {
    statusCode = 400
    message = (error as ValidationError[]).map(err => err.msg).join(', ')
  }

  // JWT errors are handled in auth middleware
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Authentication failed'
  }

  // Multer errors (file upload)
  if (error.name === 'MulterError') {
    statusCode = 400
    message = 'File upload error'
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error,
    }),
  })
}

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const createError = (statusCode: number, message: string): AppError => {
  const error = new Error(message) as AppError
  error.statusCode = statusCode
  error.isOperational = true
  return error
}