export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;

        Object.setPrototypeOf(this, new.target.prototype);

        Error.captureStackTrace(this, this.constructor);
    }
}

// 422 Unprocessable Entity 
export class ValidationError extends AppError {
    public readonly fields?: Record<string, string>;
    constructor(message: string, fields?: Record<string,string>) {
        super(message,422,'VALIDATION_ERROR');
        this.fields = fields;
    }
}

// 404 Not Found
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message,401, 'UNAUTHORIZED');
    }
}

// 403 Forbidden - Authenticated but not allowed
export class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'FORBIDDEN');
    }
}

// 409 Conflict - duplication
export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT');
    }
}