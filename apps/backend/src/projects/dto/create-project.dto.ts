import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from "class-validator";

export const PROJECT_TYPES = ["RESIDENTIAL", "OFFICE", "SHOP", "FARM", "RENTAL", "OTHER"] as const;

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ enum: PROJECT_TYPES, required: false })
  @IsOptional()
  @IsIn(PROJECT_TYPES as unknown as string[])
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}
