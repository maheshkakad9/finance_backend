import { Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboard.service";
import { success } from "../utils/response";
import { DashboardQueryInput } from "../schemas/record.schema";
import { AuthenticatedRequest } from "../middlewares/authenticate";

export class DashboardController {
  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query as DashboardQueryInput;
      const data = await dashboardService.getSummary(req.user!.id, req.user!.role, filters);
      success(res, "Dashboard summary fetched successfully", data);
    } catch (err) {
      next(err);
    }
  }

  async getByCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query as DashboardQueryInput;
      const data = await dashboardService.getByCategory(req.user!.id, req.user!.role, filters);
      success(res, "Category breakdown fetched successfully", data);
    } catch (err) {
      next(err);
    }
  }

  async getTrend(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query as DashboardQueryInput;
      const data = await dashboardService.getTrend(req.user!.id, req.user!.role, filters);
      success(res, "Weekly trend fetched successfully", data);
    } catch (err) {
      next(err);
    }
  }

  async getRecentRecords(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 10;
      const data = await dashboardService.getRecentRecords(req.user!.id, req.user!.role, limit);
      success(res, "Recent records fetched successfully", data);
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();