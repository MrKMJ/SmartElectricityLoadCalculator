import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { Worker } from "bullmq";
import { AppModule } from "../app.module";
import { ReportGenerationService } from "../reports/report-generation.service";
import { REPORTS_QUEUE } from "../queue/queue.constants";
import { resolveRedisConnection } from "../config/redis-connection";

// Standalone worker process — run with `npm run worker`. Kept separate
// from the API process (Architecture.docx §21/§36: "Don't make PDF
// generation or large analytics calculations block normal API requests").
async function bootstrap() {
  const logger = new Logger("Worker");
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);
  const reportGeneration = app.get(ReportGenerationService);

  const worker = new Worker(
    REPORTS_QUEUE,
    async (job) => {
      logger.log(`Processing job ${job.id} (${job.name}) reportId=${job.data.reportId}`);
      await reportGeneration.generate(job.data.reportId);
    },
    {
      connection: resolveRedisConnection(config),
      concurrency: 2,
    },
  );

  worker.on("completed", (job) => logger.log(`Job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`Job ${job?.id} failed: ${err.message}`));

  logger.log("Report worker started, waiting for jobs...");

  process.on("SIGTERM", async () => {
    await worker.close();
    await app.close();
    process.exit(0);
  });
}

bootstrap();
