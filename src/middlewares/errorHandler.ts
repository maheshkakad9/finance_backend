import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError, ValidationError } from "../utils/errors";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      fields: err.fields,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        res
          .status(409)
          .json({
            success: false,
            message: "A record with this value already exists",
            code: "CONFLICT",
          });
        return;
      case "P2025":
        res
          .status(404)
          .json({
            success: false,
            message: "Record not found",
            code: "NOT_FOUND",
          });
        return;
      case "P2003":
        res
          .status(400)
          .json({
            success: false,
            message: "Related record does not exist",
            code: "FOREIGN_KEY_CONSTRAINT",
          });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res
      .status(400)
      .json({
        success: false,
        message: "Invalid data provided to the database",
        code: "DB_VALIDATION",
      });
    return;
  }

  console.error("[Unhandled Error]", err);
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: "The requested route does not exist",
    code: "ROUTE_NOT_FOUND",
  });
};
