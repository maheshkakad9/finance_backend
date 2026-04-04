import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type ValidateTarget = "body" | "query" | "params";

export const validate =
  (schema: ZodSchema, target: ValidateTarget = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const fields: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path.join(".");
        if (key) fields[key] = issue.message;
      });

      res.status(422).json({
        success: false,
        message: 'Validation failed',
        fields
      });
      return;
    }

    if (target === "query") {
      Object.assign(req.query, result.data);
    } else {
      (req as any)[target] = result.data;
    }
    next();
  };
