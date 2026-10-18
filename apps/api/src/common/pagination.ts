import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
export class PaginationDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  page = 1;
  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
export function pageResult<T>(items: T[], page: PaginationDto) {
  return {
    items: items.slice(0, page.limit),
    page: page.page,
    limit: page.limit,
    nextPage: items.length > page.limit && page.page < 200 ? page.page + 1 : null,
  };
}
