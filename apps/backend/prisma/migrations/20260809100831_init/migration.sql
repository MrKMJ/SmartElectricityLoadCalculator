-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'PROFESSIONAL', 'INSTALLER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('RESIDENTIAL', 'OFFICE', 'SHOP', 'FARM', 'RENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AppliancePriority" AS ENUM ('ESSENTIAL', 'IMPORTANT', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "CalculationType" AS ENUM ('LOAD', 'PEAK', 'FULL');

-- CreateEnum
CREATE TYPE "CalculationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PROJECT_SUMMARY', 'BILL', 'SIZING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('OVERLOAD', 'SURGE_WARNING', 'HIGH_CONSUMPTION', 'PEAK_LOAD', 'SYSTEM_UNDERSIZED', 'BATTERY_WARNING', 'REPORT_READY', 'BILL_ESTIMATE', 'ENERGY_SAVING', 'GENERAL');

-- CreateEnum
CREATE TYPE "RecommendationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ScenarioApplianceAction" AS ENUM ('ADD', 'MODIFY', 'REMOVE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'INSTALLER', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING');

-- CreateEnum
CREATE TYPE "BatteryType" AS ENUM ('LEAD_ACID', 'AGM', 'GEL', 'LITHIUM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "userId" TEXT NOT NULL,
    "unitSystem" TEXT NOT NULL DEFAULT 'metric',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "defaultSafetyMargin" INTEGER NOT NULL DEFAULT 20,
    "defaultPowerFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.8,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL DEFAULT 'RESIDENTIAL',
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "region" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appliance_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "appliance_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appliance_catalog" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "ratedWatts" DOUBLE PRECISION NOT NULL,
    "minWatts" DOUBLE PRECISION,
    "maxWatts" DOUBLE PRECISION,
    "surgeWatts" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION NOT NULL DEFAULT 230,
    "frequency" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "powerFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "standbyWatts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isInverterType" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appliance_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_appliances" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "catalogApplianceId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "ratedWatts" DOUBLE PRECISION NOT NULL,
    "surgeWatts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voltage" DOUBLE PRECISION NOT NULL DEFAULT 230,
    "powerFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "standbyWatts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "daysPerMonth" INTEGER NOT NULL DEFAULT 30,
    "startTime" TEXT,
    "priority" "AppliancePriority" NOT NULL DEFAULT 'IMPORTANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "project_appliances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Daily Schedule',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_items" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "projectApplianceId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "CalculationType" NOT NULL DEFAULT 'FULL',
    "status" "CalculationStatus" NOT NULL DEFAULT 'COMPLETED',
    "engineVersion" TEXT NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "inputsSnapshot" JSONB NOT NULL,
    "safetyMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "connectedWatts" DOUBLE PRECISION,
    "runningWatts" DOUBLE PRECISION,
    "peakWatts" DOUBLE PRECISION,
    "surgeWatts" DOUBLE PRECISION,
    "dailyKwh" DOUBLE PRECISION,
    "monthlyKwh" DOUBLE PRECISION,
    "annualKwh" DOUBLE PRECISION,
    "estimatedBill" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_items" (
    "id" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "projectApplianceId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "runningWatts" DOUBLE PRECISION NOT NULL,
    "surgeWatts" DOUBLE PRECISION NOT NULL,
    "hoursPerDay" DOUBLE PRECISION NOT NULL,
    "dailyKwh" DOUBLE PRECISION NOT NULL,
    "monthlyKwh" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "calculation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_analyses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "calculationId" TEXT,
    "peakRunningWatts" DOUBLE PRECISION NOT NULL,
    "peakSurgeWatts" DOUBLE PRECISION NOT NULL,
    "peakTime" TEXT NOT NULL,
    "timeline" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "load_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariffs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "region" TEXT,
    "currency" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_slabs" (
    "id" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "minKwh" DOUBLE PRECISION NOT NULL,
    "maxKwh" DOUBLE PRECISION,
    "ratePerKwh" DOUBLE PRECISION NOT NULL,
    "fixedCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tariff_slabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tariffs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "tariffVersion" INTEGER NOT NULL,
    "tariffSnapshot" JSONB NOT NULL,
    "inputKwh" DOUBLE PRECISION NOT NULL,
    "energyCharge" DOUBLE PRECISION NOT NULL,
    "fixedCharges" DOUBLE PRECISION NOT NULL,
    "taxes" DOUBLE PRECISION NOT NULL,
    "calculatedAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inverter_calculations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "peakRunningW" DOUBLE PRECISION NOT NULL,
    "peakSurgeW" DOUBLE PRECISION NOT NULL,
    "powerFactor" DOUBLE PRECISION NOT NULL,
    "safetyMarginPct" DOUBLE PRECISION NOT NULL,
    "minInverterVA" DOUBLE PRECISION NOT NULL,
    "recommendedInverterVA" DOUBLE PRECISION NOT NULL,
    "recommendedKva" DOUBLE PRECISION NOT NULL,
    "requiredSurgeVA" DOUBLE PRECISION NOT NULL,
    "utilizationPct" DOUBLE PRECISION NOT NULL,
    "isUndersized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inverter_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battery_calculations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "loadW" DOUBLE PRECISION NOT NULL,
    "backupHours" DOUBLE PRECISION NOT NULL,
    "batteryVoltage" DOUBLE PRECISION NOT NULL,
    "batteryType" "BatteryType" NOT NULL DEFAULT 'LEAD_ACID',
    "depthOfDischarge" DOUBLE PRECISION NOT NULL,
    "inverterEfficiency" DOUBLE PRECISION NOT NULL,
    "safetyMarginPct" DOUBLE PRECISION NOT NULL,
    "requiredWh" DOUBLE PRECISION NOT NULL,
    "requiredAh" DOUBLE PRECISION NOT NULL,
    "singleBatteryAh" DOUBLE PRECISION NOT NULL,
    "numberOfBatteries" INTEGER NOT NULL,
    "configuration" TEXT NOT NULL,
    "estimatedRuntimeHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battery_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solar_calculations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "dailyKwh" DOUBLE PRECISION NOT NULL,
    "peakSunHours" DOUBLE PRECISION NOT NULL,
    "systemEfficiencyPct" DOUBLE PRECISION NOT NULL,
    "panelWattage" DOUBLE PRECISION NOT NULL,
    "desiredCoveragePct" DOUBLE PRECISION NOT NULL,
    "requiredKw" DOUBLE PRECISION NOT NULL,
    "panelQuantity" INTEGER NOT NULL,
    "estimatedDailyGenKwh" DOUBLE PRECISION NOT NULL,
    "estimatedMonthlyGenKwh" DOUBLE PRECISION NOT NULL,
    "actualCoveragePct" DOUBLE PRECISION NOT NULL,
    "batteryRequirementWh" DOUBLE PRECISION,
    "estimatedMonthlySavings" DOUBLE PRECISION,
    "paybackYears" DOUBLE PRECISION,
    "dataSource" TEXT NOT NULL DEFAULT 'formula',
    "rawProviderResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solar_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generator_calculations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runningLoadW" DOUBLE PRECISION NOT NULL,
    "startingLoadW" DOUBLE PRECISION NOT NULL,
    "powerFactor" DOUBLE PRECISION NOT NULL,
    "safetyMarginPct" DOUBLE PRECISION NOT NULL,
    "minKva" DOUBLE PRECISION NOT NULL,
    "recommendedKva" DOUBLE PRECISION NOT NULL,
    "estimatedUtilizationPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generator_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "essential_load_profiles" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "essentialRunningW" DOUBLE PRECISION NOT NULL,
    "essentialPeakW" DOUBLE PRECISION NOT NULL,
    "fullHomeRunningW" DOUBLE PRECISION NOT NULL,
    "fullHomePeakW" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "essential_load_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCalculationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_appliances" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "projectApplianceId" TEXT,
    "action" "ScenarioApplianceAction" NOT NULL DEFAULT 'MODIFY',
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "ratedWatts" DOUBLE PRECISION NOT NULL,
    "surgeWatts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursPerDay" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "scenario_appliances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_results" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "peakLoadW" DOUBLE PRECISION NOT NULL,
    "dailyKwh" DOUBLE PRECISION NOT NULL,
    "monthlyKwh" DOUBLE PRECISION NOT NULL,
    "estimatedBill" DOUBLE PRECISION NOT NULL,
    "inverterVA" DOUBLE PRECISION NOT NULL,
    "batteryAh" DOUBLE PRECISION NOT NULL,
    "solarKw" DOUBLE PRECISION NOT NULL,
    "generatorKva" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "RecommendationSeverity" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "ReportType" NOT NULL DEFAULT 'PROJECT_SUMMARY',
    "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
    "engineVersion" TEXT,
    "storageKey" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "meta" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "projects_ownerId_idx" ON "projects"("ownerId");

-- CreateIndex
CREATE INDEX "project_members_projectId_idx" ON "project_members"("projectId");

-- CreateIndex
CREATE INDEX "project_members_userId_idx" ON "project_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "project_members"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "appliance_categories_name_key" ON "appliance_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "appliance_categories_slug_key" ON "appliance_categories"("slug");

-- CreateIndex
CREATE INDEX "appliance_catalog_categoryId_idx" ON "appliance_catalog"("categoryId");

-- CreateIndex
CREATE INDEX "project_appliances_projectId_idx" ON "project_appliances"("projectId");

-- CreateIndex
CREATE INDEX "schedules_projectId_idx" ON "schedules"("projectId");

-- CreateIndex
CREATE INDEX "schedule_items_scheduleId_idx" ON "schedule_items"("scheduleId");

-- CreateIndex
CREATE INDEX "calculations_projectId_idx" ON "calculations"("projectId");

-- CreateIndex
CREATE INDEX "calculations_createdAt_idx" ON "calculations"("createdAt");

-- CreateIndex
CREATE INDEX "calculation_items_calculationId_idx" ON "calculation_items"("calculationId");

-- CreateIndex
CREATE INDEX "load_analyses_projectId_idx" ON "load_analyses"("projectId");

-- CreateIndex
CREATE INDEX "tariffs_countryCode_idx" ON "tariffs"("countryCode");

-- CreateIndex
CREATE INDEX "tariff_slabs_tariffId_idx" ON "tariff_slabs"("tariffId");

-- CreateIndex
CREATE UNIQUE INDEX "project_tariffs_projectId_key" ON "project_tariffs"("projectId");

-- CreateIndex
CREATE INDEX "bills_projectId_idx" ON "bills"("projectId");

-- CreateIndex
CREATE INDEX "bills_createdAt_idx" ON "bills"("createdAt");

-- CreateIndex
CREATE INDEX "inverter_calculations_projectId_idx" ON "inverter_calculations"("projectId");

-- CreateIndex
CREATE INDEX "battery_calculations_projectId_idx" ON "battery_calculations"("projectId");

-- CreateIndex
CREATE INDEX "solar_calculations_projectId_idx" ON "solar_calculations"("projectId");

-- CreateIndex
CREATE INDEX "generator_calculations_projectId_idx" ON "generator_calculations"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "essential_load_profiles_projectId_key" ON "essential_load_profiles"("projectId");

-- CreateIndex
CREATE INDEX "scenarios_projectId_idx" ON "scenarios"("projectId");

-- CreateIndex
CREATE INDEX "scenario_appliances_scenarioId_idx" ON "scenario_appliances"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_results_scenarioId_key" ON "scenario_results"("scenarioId");

-- CreateIndex
CREATE INDEX "recommendations_projectId_idx" ON "recommendations"("projectId");

-- CreateIndex
CREATE INDEX "reports_projectId_idx" ON "reports"("projectId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appliance_catalog" ADD CONSTRAINT "appliance_catalog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "appliance_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_appliances" ADD CONSTRAINT "project_appliances_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_appliances" ADD CONSTRAINT "project_appliances_catalogApplianceId_fkey" FOREIGN KEY ("catalogApplianceId") REFERENCES "appliance_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_items" ADD CONSTRAINT "schedule_items_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_items" ADD CONSTRAINT "calculation_items_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_items" ADD CONSTRAINT "calculation_items_projectApplianceId_fkey" FOREIGN KEY ("projectApplianceId") REFERENCES "project_appliances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_analyses" ADD CONSTRAINT "load_analyses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_analyses" ADD CONSTRAINT "load_analyses_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_slabs" ADD CONSTRAINT "tariff_slabs_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "tariffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tariffs" ADD CONSTRAINT "project_tariffs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tariffs" ADD CONSTRAINT "project_tariffs_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "tariffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "tariffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inverter_calculations" ADD CONSTRAINT "inverter_calculations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battery_calculations" ADD CONSTRAINT "battery_calculations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solar_calculations" ADD CONSTRAINT "solar_calculations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generator_calculations" ADD CONSTRAINT "generator_calculations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_load_profiles" ADD CONSTRAINT "essential_load_profiles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_appliances" ADD CONSTRAINT "scenario_appliances_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_appliances" ADD CONSTRAINT "scenario_appliances_projectApplianceId_fkey" FOREIGN KEY ("projectApplianceId") REFERENCES "project_appliances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_results" ADD CONSTRAINT "scenario_results_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
