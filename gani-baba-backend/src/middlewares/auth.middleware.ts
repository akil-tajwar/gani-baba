import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../services/utils/errors.utils";
import {
  extractTokenFromHeader,
  getUserPermissions,
  verifyAccessToken,
} from "../services/utils/jwt.utils";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    console.log("Token received on API:", req.headers.authorization);
    const decoded = verifyAccessToken(token);

    const permissions = await getUserPermissions(decoded.userId);

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,

      hasPermission: (perm: string) => permissions.includes(perm),
      hasRole: (role: number) => decoded.role === role,
    };
    console.log(permissions);
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