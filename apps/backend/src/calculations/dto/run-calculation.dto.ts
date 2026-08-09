import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumber, IsOptional, Max, Min } from "class-validator";

export class RunCalculationDto {
  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  safetyMargin?: number;

  @ApiProperty({ required: false, enum: ["LOAD", "PEAK", "FULL"], default: "FULL" })
  @IsOptional()
  @IsIn(["LOAD", "PEAK", "FULL"])
  type?: string;
}
