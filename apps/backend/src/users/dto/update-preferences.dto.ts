import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class UpdatePreferencesDto {
  @ApiProperty({ required: false, enum: ["metric", "imperial"] })
  @IsOptional()
  @IsIn(["metric", "imperial"])
  unitSystem?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  defaultSafetyMargin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultPowerFactor?: number;

  // Installer/professional white-label branding (used on generated quotations).
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;

  @ApiProperty({ required: false, description: "data: URI for a small logo image" })
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  @Matches(/^data:image\/(png|jpeg|jpg|svg\+xml);base64,/, {
    message: "logoDataUrl must be a base64 data: URI for a PNG, JPEG, or SVG image",
  })
  logoDataUrl?: string;

  @ApiProperty({ required: false, example: "#18813f" })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "brandColorHex must be a 6-digit hex color like #18813f" })
  brandColorHex?: string;
}
