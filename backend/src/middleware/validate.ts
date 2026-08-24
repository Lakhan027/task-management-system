import { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/response.js';
import { trace } from '../utils/trace.js';

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type Validator = (data: any) => ValidationResult;

export const validateBody = (validator: Validator) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validator(req.body);

    if (!result.isValid) {
      trace('9-POST', 'GUARD 3 ❌ body galat → 400, ROK DIYA ⛔', result.errors);
      sendError(res, 400, 'Validation failed', result.errors);
      return;
    }

    trace('9-POST', 'GUARD 3 ✅ body sahi (ye stop sirf POST/PUT/PATCH pe hai)');
    next();
  };
};
