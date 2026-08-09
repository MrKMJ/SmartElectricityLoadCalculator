import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { REPORTS_QUEUE, REPORTS_QUEUE_TOKEN } from "./queue.constants";
import { resolveRedisConnection } from "../config/redis-connection";

// Background job architecture (Architecture.docx §21/§36): API requests
// only ever enqueue work here; a separate worker process (jobs/worker.main.ts)
// consumes the queue so PDF generation never blocks a normal API request.
@Global()
@Module({
  providers: [
    {
      provide: REPORTS_QUEUE_TOKEN,
      useFactory: (config: ConfigService) =>
        new Queue(REPORTS_QUEUE, { connection: resolveRedisConnection(config) }),
      inject: [ConfigService],
    },
  ],
  exports: [REPORTS_QUEUE_TOKEN],
})
export class QueueModule {}
