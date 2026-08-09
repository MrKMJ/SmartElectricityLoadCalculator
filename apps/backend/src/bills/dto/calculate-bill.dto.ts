import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, Min } from "class-validator";

export class CalculateBillDto {
  @ApiProperty({ required: false, description: "Overrides the project's latest calculated monthly kWh." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyKwh?: number;
}
