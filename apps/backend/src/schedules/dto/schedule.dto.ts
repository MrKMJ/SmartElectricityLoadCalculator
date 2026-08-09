import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpsertScheduleItemDto {
  @ApiProperty({ example: "07:00" })
  @IsString()
  @Matches(TIME_PATTERN, { message: "startTime must be in HH:mm format" })
  startTime: string;

  @ApiProperty({ example: "09:00" })
  @IsString()
  @Matches(TIME_PATTERN, { message: "endTime must be in HH:mm format" })
  endTime: string;
}
