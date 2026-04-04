import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { success, created } from "../utils/response";
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
} from "../schemas/auth.schema";
import { UnauthorizedError } from "../utils/errors";
import { Role } from "@prisma/client";

// Extend Request locally — guaranteed to work regardless of d.ts loading issues
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export class AuthController {
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = req.body as RegisterInput;
      const result = await authService.register(input);
      created(res, "Account created successfully", result);
    } catch (err) {
      next(err);
    }
  }

  async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = req.body as LoginInput;
      const result = await authService.login(input);
      success(res, "Login successful", result);
    } catch (err) {
      next(err);
    }
  }

  async refresh(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      const tokens = await authService.refresh(refreshToken);
      success(res, "Tokens refreshed successfully", { tokens });
    } catch (err) {
      next(err);
    }
  }

  async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        throw new UnauthorizedError("Access token is required");
      }
      const accessToken = authHeader.split(" ")[1];
      const { refreshToken } = req.body;
      await authService.logout(accessToken, refreshToken);
      success(res, "Logged out successfully");
    } catch (err) {
      next(err);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError("User not authenticated");
      }
      const user = await authService.getMe(req.user.id);
      success(res, "User fetched successfully", { user });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();