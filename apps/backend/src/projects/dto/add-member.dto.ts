import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn } from "class-validator";

export const MEMBER_ROLES = ["VIEWER", "EDITOR", "ADMIN"] as const;

export class AddMemberDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: MEMBER_ROLES })
  @IsIn(MEMBER_ROLES as unknown as string[])
  role: string;
}
