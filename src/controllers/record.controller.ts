import { Response, NextFunction } from "express";
import { recordService } from "../services/record.service";
import { success, created, paginated } from "../utils/response";
import { CreateRecordInput, UpdateRecordInput } from "../schemas/record.schema";
import { AuthenticatedRequest } from "../middlewares/authenticate";

export class RecordController {
  async createRecord(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateRecordInput;
      const record = await recordService.createRecord(input, req.user!.id);
      created(res, "Financial record created successfully", { record });
    } catch (err) {
      next(err);
    }
  }

  async getRecords(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { records, meta } = await recordService.getRecords(
        req.query as Record<string, unknown>,
        req.user!.id,
        req.user!.role
      );
      paginated(res, "Records fetched successfully", records, meta);
    } catch (err) {
      next(err);
    }
  }

  async getRecordById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await recordService.getRecordById(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      success(res, "Record fetched successfully", { record });
    } catch (err) {
      next(err);
    }
  }

  async updateRecord(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateRecordInput;
      const record = await recordService.updateRecord(
        req.params.id,
        input,
        req.user!.id,
        req.user!.role
      );
      success(res, "Record updated successfully", { record });
    } catch (err) {
      next(err);
    }
  }

  async deleteRecord(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await recordService.deleteRecord(req.params.id, req.user!.id, req.user!.role);
      success(res, "Record deleted successfully");
    } catch (err) {
      next(err);
    }
  }

  async restoreRecord(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await recordService.restoreRecord(req.params.id);
      success(res, "Record restored successfully", { record });
    } catch (err) {
      next(err);
    }
  }
}

export const recordController = new RecordController();