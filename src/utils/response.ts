import { Response } from 'express';

// 200 OK
export const success = (
    res: Response,
    message: string,
    data: unknown = {},
    statusCode = 200
) : Response => {
    return res.status(statusCode).json({ success: true, message, data });
}

// 201 Created
export const created = (res: Response, message: string, data: unknown = {}) : Response => {
    return res.status(201).json({ success: true, message, data });
};

// 400 
export const error = (res: Response, message: string, code = 400): Response => {
    return res.status(code).json({ success: false, message });
};

// 422 Validation error
export const validationError = (
    res: Response,
    message: string,
    fields: Record<string,string>
) : Response => {
    return res.status(422).json({ success: false, message, fields });
};

// Paginated list response
export const paginated = (
    res: Response,
    message: string,
    data: unknown[],
    meta: { total: number; page: number; limit: number; totalPages: number }
) : Response => {
    return res.status(200).json({ success: true, message, data, meta });
};