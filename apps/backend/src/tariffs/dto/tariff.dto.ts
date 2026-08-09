import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class TariffSlabDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  minKwh: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  maxKwh?: number | null;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  ratePerKwh: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedCharge?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRatePct?: number;
}

export class CreateTariffDto {
  @ApiProperty()
  @IsString()
  provider: string;

  @ApiProperty()
  @IsString()
  countryCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: [TariffSlabDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TariffSlabDto)
  slabs: TariffSlabDto[];
}

export class SelectProjectTariffDto {
  @ApiProperty()
  @IsString()
  tariffId: string;
}
