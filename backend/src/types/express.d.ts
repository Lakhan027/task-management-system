// src/types/express.d.ts
import 'express';

declare module 'express' {
  export interface Request {
    user?: {
      id: number;
      email: string;
      iat?: number;
      exp?: number;
    };
  }
}