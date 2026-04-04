import { Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { userService } from "../services/user.service";
import { success } from "../utils/response";
import { UpdateUserRoleInput } from "../schemas/record.schema";
import { AuthenticatedRequest } from "../middlewares/authenticate";

export class UserController {
  async getAllUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { users, meta } = await userService.getAllUsers(req.query as Record<string, unknown>);
      res.status(200).json({ success: true, message: "Users fetched successfully", data: users, meta });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);
      success(res, "User fetched successfully", { user });
    } catch (err) {
      next(err);
    }
  }

  async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = req.body as UpdateUserRoleInput;
      const user = await userService.updateUserRole(
        req.params.id,
        role as Role,
        req.user!.id
      );
      success(res, "User role updated successfully", { user });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.softDeleteUser(req.params.id, req.user!.id);
      success(res, "User deleted successfully");
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();