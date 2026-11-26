import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../services/utils/errors.utils";
import {
  extractTokenFromHeader,
  getUserPermissions,
  verifyAccessToken,
} from "../services/utils/jwt.utils";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    // console.log("Token received on API:", req.headers.authorization);
    const decoded = verifyAccessToken(token);

    const permissions = await getUserPermissions(decoded.userId);

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,

      hasPermission: (perm: string) => permissions.includes(perm),
      hasRole: (role: number) => decoded.role === role,
    };
    // console.log(permissions);
    next();
  } catch (error) {
    console.error(error);
    next(UnauthorizedError("Invalid token"));
  }
};

export const optionalAuthenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    
    // If no header exists, just move on as a guest
    if (!authHeader) {
      return next();
    }

    const token = extractTokenFromHeader(authHeader);
    const decoded = verifyAccessToken(token);

    const permissions = await getUserPermissions(decoded.userId);

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      hasPermission: (perm: string) => permissions.includes(perm),
      hasRole: (role: number) => decoded.role === role,
    };
    
    next();
  } catch (error) {
    // If the token is invalid/expired, treat them as a guest instead of throwing 401
    console.log("Optional auth: Invalid token, treating as guest");
    next();
  }
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many login attempts, please try again after 15 minutes',
  },
  keyGenerator: (req: Request) => {
    const ip = ipKeyGenerator(
      req.ip || req.connection.remoteAddress || 'unknown'
    )
    const username = req.body?.email || req.body?.username || 'unknown'
    return `${ip}:${username}`
  },
  skip: (req) => req.method === 'OPTIONS',
})

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many OTP requests from this IP, please try again after 15 minutes',
  },
  // ✅ Key by IP and Phone Number to prevent SMS bombing a specific number
  keyGenerator: (req: Request) => {
    const ip = ipKeyGenerator(
      req.ip || req.connection.remoteAddress || 'unknown'
    )
    const phone = req.body?.phone || 'unknown'
    return `${ip}:${phone}`
  },
  skip: (req) => req.method === 'OPTIONS',
})