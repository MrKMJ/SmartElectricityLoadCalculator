import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

const DEV_SECRET_DEFAULTS = ["dev_access_secret_change_me", "dev_refresh_secret_change_me"];

// Fail fast rather than silently run production traffic on the dev JWT
// secrets baked into configuration.ts's fallbacks — a deploy misconfigured
// this way would still "work" but every token would be forgeable.
function assertProductionSecretsConfigured() {
  if (process.env.NODE_ENV !== "production") return;
  const missing: string[] = [];
  if (!process.env.JWT_ACCESS_SECRET || DEV_SECRET_DEFAULTS.includes(process.env.JWT_ACCESS_SECRET)) {
    missing.push("JWT_ACCESS_SECRET");
  }
  if (!process.env.JWT_REFRESH_SECRET || DEV_SECRET_DEFAULTS.includes(process.env.JWT_REFRESH_SECRET)) {
    missing.push("JWT_REFRESH_SECRET");
  }
  if (missing.length > 0) {
    throw new Error(
      `Refusing to start in production with insecure JWT secrets. Set ${missing.join(" and ")} to strong random values.`,
    );
  }
}

async function bootstrap() {
  assertProductionSecretsConfigured();

  const app = await NestFactory.create(AppModule);

  const configuredPrefix = process.env.API_PREFIX ?? "api/v1";
  app.setGlobalPrefix(configuredPrefix);

  app.use(helmet());

  // FRONTEND_URL may be a single origin or a comma-separated list (e.g. a
  // production custom domain plus the provider's default subdomain).
  const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger docs are a useful map of the API but shouldn't be public on a
  // real deployment — only mount them outside production.
  if (process.env.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Smart Energy Load Calculator API")
      .setDescription(
        "Calculation engine, system-sizing engine, tariff engine, scenario engine and reporting layer.",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
  }

  const logger = new Logger("Bootstrap");
  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port, "0.0.0.0");
  logger.log(`API listening on port ${port} (prefix: /${configuredPrefix})`);
  logger.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
}

bootstrap();
