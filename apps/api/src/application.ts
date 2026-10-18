import "reflect-metadata";
import { createHash, randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { json, type Request, type Response, type NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { SafeExceptionFilter } from "./common/http";
import type { ApiConfig } from "./config/config";
import { completeOpenApi } from "./common/openapi";
export async function createApplication(config: ApiConfig, log = true) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(config), {
    logger: false,
    bodyParser: false,
    abortOnError: false,
  });
  app.disable("x-powered-by");
  // No forwarded address is trusted. Configure an explicit proxy policy before scaling.
  app.set("trust proxy", false);
  app.setGlobalPrefix("api/v1");
  app.use((req: Request, res: Response, next: NextFunction) => {
    const started = performance.now();
    const requestId = randomUUID();
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("Cache-Control", "no-store");
    if (log)
      res.on("finish", () =>
        process.stdout.write(
          `${JSON.stringify({ event: "http", requestId, method: req.method, status: res.statusCode, durationMs: Math.round(performance.now() - started) })}\n`,
        ),
      );
    next();
  });
  app.use(helmet());
  const denied = (_req: Request, res: Response) =>
    res.status(429).json({
      error: {
        status: 429,
        message: "Too many requests",
        requestId: res.getHeader("X-Request-Id"),
      },
    });
  app.use(
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: denied,
      skip: (req: Request) =>
        req.path === "/api/v1/health/live" || req.path === "/api/v1/health/ready",
    }),
  );
  app.enableCors({
    origin: config.corsOrigins,
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Request-Id"],
  });
  app.use(json({ limit: "1500kb", strict: true }));
  const authPaths = ["/api/v1/auth/register", "/api/v1/auth/login"];
  app.use(
    authPaths,
    rateLimit({
      windowMs: 60000,
      limit: 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: denied,
    }),
  );
  app.use(
    authPaths,
    rateLimit({
      windowMs: 15 * 60000,
      limit: 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: denied,
      keyGenerator: (req: Request) => {
        const body: unknown = req.body;
        const email =
          body && typeof body === "object" && "email" in body && typeof body.email === "string"
            ? body.email.trim().toLowerCase().slice(0, 254)
            : "invalid";
        return createHash("sha256").update(email).digest("hex");
      },
    }),
  );
  app.useGlobalFilters(new SafeExceptionFilter());
  const document = completeOpenApi(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("Traffic Laws API")
        .setDescription(
          "MVP API. Bearer sessions, immutable revisions, owner-controlled publication and private learning progress. See apps/api/README.md for contracts and limitations.",
        )
        .setVersion("1.0.0")
        .addBearerAuth()
        .build(),
    ),
  );
  if (config.swaggerEnabled)
    SwaggerModule.setup("api/docs", app, document, {
      jsonDocumentUrl: "api/openapi.json",
      swaggerOptions: { persistAuthorization: false },
    });
  await app.init();
  return { app, document };
}
