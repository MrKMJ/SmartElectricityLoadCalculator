import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumber, IsOptional, Max, Min } from "class-validator";

export class InverterSizingDto {
  @ApiProperty({ required: false, description: "Uses the project's latest calculation if omitted." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peakRunningW?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peakSurgeW?: number;

  @ApiProperty({ required: false, default: 0.8 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  powerFactor?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  safetyMargin?: number;

  @ApiProperty({ required: false, description: "An inverter VA you're considering, to check for undersizing." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  candidateInverterVA?: number;
}

export const BATTERY_TYPES = ["LEAD_ACID", "AGM", "GEL", "LITHIUM"] as const;

export class BatterySizingDto {
  @ApiProperty({ required: false, description: "Uses the project's latest calculation if omitted." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loadW?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0.1)
  @Max(168)
  backupHours: number;

  @ApiProperty({ required: false, default: 12 })
  @IsOptional()
  @IsNumber()
  batteryVoltage?: number;

  @ApiProperty({ required: false, enum: BATTERY_TYPES, default: "LEAD_ACID" })
  @IsOptional()
  @IsIn(BATTERY_TYPES as unknown as string[])
  batteryType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(1)
  depthOfDischarge?: number;

  @ApiProperty({ required: false, default: 0.9 })
  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(1)
  inverterEfficiency?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  safetyMargin?: number;

  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  singleBatteryAh?: number;
}

export class SolarSizingDto {
  @ApiProperty({ required: false, description: "Uses the project's latest calculation if omitted." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyKwh?: number;

  @ApiProperty({ required: false, description: "Looked up via Open-Meteo from the project's location if omitted." })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(14)
  peakSunHours?: number;

  @ApiProperty({ required: false, default: 80 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  systemEfficiencyPct?: number;

  @ApiProperty({ required: false, default: 550 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  panelWattage?: number;

  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  desiredCoveragePct?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  electricityRatePerKwh?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  systemCostPerKw?: number;
}

export class GeneratorSizingDto {
  @ApiProperty({ required: false, description: "Uses the project's latest calculation if omitted." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  runningLoadW?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startingLoadW?: number;

  @ApiProperty({ required: false, default: 0.8 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  powerFactor?: number;

  @ApiProperty({ required: false, default: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  safetyMargin?: number;
}
