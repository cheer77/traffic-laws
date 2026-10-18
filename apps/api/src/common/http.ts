import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
  ValidationPipe,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Prisma } from "../../.generated/client/client";
export function bodyValidation(expectedType: new () => object) {
  return new ValidationPipe({
    expectedType,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    validationError: { target: false, value: false },
  });
}
const ERROR_MESSAGES: Record<number, string> = {
  400: "Invalid request",
  401: "Authentication required",
  403: "Access denied",
  404: "Not found",
  409: "Conflict",
  413: "Request body too large",
  415: "Unsupported media type",
  429: "Too many requests",
  503: "Service unavailable",
};
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    let status = error instanceof HttpException ? error.getStatus() : 500;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (["P2002", "P2003", "P2034"].includes(error.code)) status = 409;
      else if (error.code === "P2025") status = 404;
      else if (["P1001", "P1002", "P2024"].includes(error.code)) status = 503;
    }
    if (error instanceof Prisma.PrismaClientInitializationError) status = 503;
    if (error && typeof error === "object" && "type" in error) {
      if (error.type === "entity.parse.failed") status = 400;
      if (error.type === "entity.too.large") status = 413;
    }
    response.status(status).json({
      error: {
        status,
        message: ERROR_MESSAGES[status] ?? "Internal server error",
        requestId: request.res?.getHeader("X-Request-Id"),
      },
    });
  }
}
