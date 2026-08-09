import { ConfigService } from "@nestjs/config";
import type { ConnectionOptions } from "bullmq";

/**
 * Resolves ioredis/BullMQ connection options for either:
 *   - a managed Redis provider (Railway, Upstash, Redis Cloud, ...) that
 *     hands you a single REDIS_URL with auth and possibly TLS baked in
 *     (redis://user:pass@host:port or rediss://... for TLS), or
 *   - local docker-compose Redis, which has no auth — REDIS_HOST/PORT.
 *
 * Used by both the API's QueueModule and the standalone worker process so
 * the two never drift out of sync on how they connect.
 */
export function resolveRedisConnection(config: ConfigService): ConnectionOptions {
  const url = config.get<string>("redis.url");
  if (url) {
    const parsed = new URL(url);
    const isTls = parsed.protocol === "rediss:";
    return {
      host: parsed.hostname,
      port: Number(parsed.port || (isTls ? 6380 : 6379)),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      ...(isTls ? { tls: {} } : {}),
    };
  }

  return {
    host: config.get<string>("redis.host"),
    port: config.get<number>("redis.port"),
  };
}
