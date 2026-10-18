import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
export class CredentialsDto {
  @ApiProperty({ type: String, format: "email", maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ type: String, minLength: 15, maxLength: 128, format: "password", writeOnly: true })
  @IsString()
  @MinLength(15)
  @MaxLength(128)
  password!: string;
}
