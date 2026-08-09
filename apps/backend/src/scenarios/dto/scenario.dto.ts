import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateScenarioDto {
  @ApiProperty()
  @IsString()
  name: string;
}

export const SCENARIO_APPLIANCE_ACTIONS = ["ADD", "MODIFY", "REMOVE"] as const;

export class UpsertScenarioApplianceDto {
  @ApiProperty({ required: false, description: "Omit when adding a brand-new appliance to the scenario." })
  @IsOptional()
  @IsString()
  projectApplianceId?: string;

  @ApiProperty({ enum: SCENARIO_APPLIANCE_ACTIONS })
  @IsIn(SCENARIO_APPLIANCE_ACTIONS as unknown as string[])
  action: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  ratedWatts: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  surgeWatts?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  hoursPerDay: number;
}

export class CompareScenariosDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  scenarioIds: string[];
}
