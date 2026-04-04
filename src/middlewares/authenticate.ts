import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/token";
import { UnauthorizedError } from "../utils/errors";
import redis from "../config/redis";

// Augment Request inline — avoids all d.ts loading issues with ts-node
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access token is required");
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    // Check Redis blacklist (tokens are blacklisted on logout)
    const isBlacklisted = await redis.get(`blacklist:${payload.jti}`);
    if (isBlacklisted) {
      throw new UnauthorizedError("Token has been revoked. Please log in again.");
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role as Role,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return next(err);
    }
    next(new UnauthorizedError("Invalid or expired access token"));
  }
};