export default () => ({
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret_change_me",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret_change_me",
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
  },
  redis: {
    // Managed Redis (Railway, Upstash, Redis Cloud, ...) hands you a single
    // connection string with auth/TLS baked in — prefer that when present.
    // Local docker-compose Redis has no auth, so REDIS_HOST/PORT still work
    // standalone for development.
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    region: process.env.S3_REGION ?? "us-east-1",
    accessKey: process.env.S3_ACCESS_KEY ?? "energy_minio",
    secretKey: process.env.S3_SECRET_KEY ?? "energy_minio_password",
    bucket: process.env.S3_BUCKET ?? "energy-app",
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
  },
  integrations: {
    nrelApiKey: process.env.NREL_API_KEY ?? "DEMO_KEY",
    openMeteoBaseUrl: process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com/v1",
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    googleVisionApiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY ?? "",
    postmarkToken: process.env.POSTMARK_SERVER_TOKEN ?? "",
    twilioSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    twilioToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    sentryDsn: process.env.SENTRY_DSN ?? "",
    posthogKey: process.env.POSTHOG_API_KEY ?? "",
  },
});
