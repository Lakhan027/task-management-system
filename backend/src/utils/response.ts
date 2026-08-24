import { Response } from 'express';
import { trace } from './trace.js';

export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  code?: string;
}

export const sendSuccess = <T = unknown>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: Record<string, unknown>
): Response => {
  trace('13a', 'sendSuccess → ' + statusCode + ' "' + message + '" — ab res.json chalega');
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
    ...(meta ? { meta } : {}),
  } satisfies SuccessResponse<T>);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: string[],
  code?: string
): Response => {
  trace('13a', 'sendError → ' + statusCode + ' "' + message + '"');
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && errors.length > 0 ? { errors } : {}),
    ...(code ? { code } : {}),
  } satisfies ErrorResponse);
};
