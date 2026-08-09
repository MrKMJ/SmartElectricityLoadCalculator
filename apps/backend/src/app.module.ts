import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import configuration from "./config/configuration";

import { PrismaModule } from "./common/prisma/prisma.module";
import { CalculationEngineModule } from "./common/calculation-engine/calculation-engine.module";
import { AuditModule } from "./audit/audit.module";
import { StorageModule } from "./storage/storage.module";
import { QueueModule } from "./queue/queue.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { NotificationsModule } from "./notifications/notifications.module";

import { HealthController } from "./health/health.controller";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ProjectsModule } from "./projects/projects.module";
import { AppliancesModule } from "./appliances/appliances.module";
import { CalculationsModule } from "./calculations/calculations.module";
import { LoadAnalysisModule } from "./load-analysis/load-analysis.module";
import { TariffsModule } from "./tariffs/tariffs.module";
import { BillsModule } from "./bills/bills.module";
import { SizingModule } from "./sizing/sizing.module";
import { EssentialLoadModule } from "./essential-load/essential-load.module";
import { ScenariosModule } from "./scenarios/scenarios.module";
import { RecommendationsModule } from "./recommendations/recommendations.module";
import { ReportsModule } from "./reports/reports.module";
import { AdminModule } from "./admin/admin.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { EnergyAnalysisModule } from "./energy-analysis/energy-analysis.module";
import { InstallerModule } from "./installer/installer.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),

    // Global infrastructure
    PrismaModule,
    CalculationEngineModule,
    AuditModule,
    StorageModule,
    QueueModule,
    IntegrationsModule,
    NotificationsModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    AppliancesModule,
    CalculationsModule,
    LoadAnalysisModule,
    TariffsModule,
    BillsModule,
    SizingModule,
    EssentialLoadModule,
    ScenariosModule,
    RecommendationsModule,
    ReportsModule,
    AdminModule,
    SchedulesModule,
    EnergyAnalysisModule,
    InstallerModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
