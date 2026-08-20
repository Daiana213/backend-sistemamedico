export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distingue "error esperado" de "bug inesperado"
    Error.captureStackTrace(this, this.constructor);
  }
}