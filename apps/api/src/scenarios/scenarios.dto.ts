import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { PaginationDto } from "../common/pagination";
export class InternalScenarioQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    type: String,
    maxLength: 80,
    description: "Case-insensitive scenario ID substring.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
  @ApiPropertyOptional({ enum: ["draft", "in_review"] })
  @IsOptional()
  @IsIn(["draft", "in_review"])
  status?: "draft" | "in_review";
}
export class DraftDto {
  @ApiProperty({
    type: Object,
    description:
      "Scenario v1 JSON; only draft/in_review accepted. Validated by @traffic-laws/scenarios.",
  })
  @IsObject()
  payload!: Record<string, unknown>;
  @ApiProperty({
    type: Number,
    minimum: 0,
    description: "0 creates a scenario. Otherwise must match the latest immutable revision.",
  })
  @IsInt()
  @Min(0)
  @Max(2147483646)
  expectedRevision!: number;
}
export class ReviewDto {
  @ApiProperty({ enum: ["recommend_approval", "changes_requested", "rejected"] })
  @IsIn(["recommend_approval", "changes_requested", "rejected"])
  decision!: "recommend_approval" | "changes_requested" | "rejected";
  @ApiProperty({
    type: String,
    minLength: 10,
    maxLength: 2000,
    description:
      "Human review rationale/evidence reference. A recommendation is not legal approval or publication.",
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  evidence!: string;
}
