import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Matches, Max, MaxLength, Min } from "class-validator";
export class AttemptDto {
  @ApiProperty({ type: String, maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)
  scenarioId!: string;
  @ApiProperty({ type: Number, minimum: 1 }) @IsInt() @Min(1) @Max(2147483647) revision!: number;
  @ApiProperty({ type: String, maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)
  answerId!: string;
}
