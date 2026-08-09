import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateCatalogApplianceDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(500000)
  ratedWatts: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minWatts?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxWatts?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  surgeWatts?: number;

  @ApiProperty({ required: false, default: 230 })
  @IsOptional()
  @IsNumber()
  voltage?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsNumber()
  frequency?: number;

  @ApiProperty({ required: false, default: 0.9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  powerFactor?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  standbyWatts?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isInverterType?: boolean;
}

export class UpdateCatalogApplianceDto extends CreateCatalogApplianceDto {}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}
