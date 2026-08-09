import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export const PRIORITIES = ["ESSENTIAL", "IMPORTANT", "OPTIONAL"] as const;

export class CreateProjectApplianceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  catalogApplianceId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(500000)
  ratedWatts: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  surgeWatts?: number;

  @ApiProperty({ required: false, default: 230 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  voltage?: number;

  @ApiProperty({ required: false, default: 0.9 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  powerFactor?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  standbyWatts?: number;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(0)
  @Max(24)
  hoursPerDay: number;

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(31)
  daysPerMonth?: number;

  @ApiProperty({ required: false, description: '"HH:mm" — used by the peak-load timeline' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ enum: PRIORITIES, required: false, default: "IMPORTANT" })
  @IsOptional()
  @IsIn(PRIORITIES as unknown as string[])
  priority?: string;
}

export class UpdateProjectApplianceDto extends PartialType(CreateProjectApplianceDto) {}

export class BulkCreateProjectApplianceDto {
  @ApiProperty({ type: [CreateProjectApplianceDto] })
  appliances: CreateProjectApplianceDto[];
}
