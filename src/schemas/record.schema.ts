import { z } from "zod";

export const createRecordSchema = z.object({
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be a positive number")
    .multipleOf(0.01, "Amount can have at most 2 decimal places"),

  type: z.enum(["INCOME", "EXPENSE"], {
    message: "Type must be INCOME or EXPENSE", 
  }),

  category: z
    .string()
    .min(1, "Category is required")
    .max(100, "Category must be at most 100 characters")
    .trim(),

  date: z
    .string({ message: "Date is required" }) 
    .datetime({ message: "Date must be a valid ISO 8601 datetime" }),

  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional(),
});

export const updateRecordSchema = createRecordSchema.partial();

export const recordQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(["date", "amount", "createdAt"]).optional().default("date"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
});

export const dashboardQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["VIEWER", "ANALYST", "ADMIN"], {
    message: "Role must be VIEWER, ANALYST, or ADMIN", 
  }),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type RecordQueryInput = z.infer<typeof recordQuerySchema>;
export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;