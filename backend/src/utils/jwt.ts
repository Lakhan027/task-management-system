import jwt, { Secret, SignOptions } from "jsonwebtoken";



const JWT_SECRET: Secret = process.env.JWT_SECRET as string;

const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "7d";

export const generateToken = (payload: { id: number; email: string }) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};