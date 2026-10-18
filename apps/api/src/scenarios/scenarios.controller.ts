import { RevisionPipe } from "../common/revision.pipe";
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentIdentity, Public, Roles, type Identity } from "../auth/auth.guard";
import { bodyValidation } from "../common/http";
import { PaginationDto } from "../common/pagination";
import { DraftDto, ReviewDto } from "./scenarios.dto";
import { questionView, ScenariosService } from "./scenarios.service";
@ApiTags("scenarios")
@Controller("scenarios")
export class ScenariosController {
  constructor(@Inject(ScenariosService) private readonly scenarios: ScenariosService) {}
  @Public()
  @Get()
  list(@Query(bodyValidation(PaginationDto)) page: PaginationDto) {
    return this.scenarios.list(page);
  }
  @Public()
  @Get(":id/revisions/:revision")
  async question(@Param("id") id: string, @Param("revision", RevisionPipe) revision: number) {
    return questionView(await this.scenarios.eligible(id, revision));
  }
}
@ApiTags("internal-content")
@ApiBearerAuth()
@Roles("admin", "reviewer")
@Controller("internal/scenarios")
export class InternalScenariosController {
  constructor(@Inject(ScenariosService) private readonly scenarios: ScenariosService) {}
  @Post("revisions")
  @ApiBody({ type: DraftDto })
  create(@Body(bodyValidation(DraftDto)) body: DraftDto, @CurrentIdentity() identity: Identity) {
    return this.scenarios.saveDraft(body, identity.user.id);
  }
  @Get(":id/revisions/:revision")
  get(@Param("id") id: string, @Param("revision", RevisionPipe) revision: number) {
    return this.scenarios.internalRevision(id, revision);
  }
  @Post(":id/revisions/:revision/reviews")
  @ApiBody({ type: ReviewDto })
  review(
    @Param("id") id: string,
    @Param("revision", RevisionPipe) revision: number,
    @Body(bodyValidation(ReviewDto)) body: ReviewDto,
    @CurrentIdentity() identity: Identity,
  ) {
    return this.scenarios.review(id, revision, body, identity.user.id);
  }
  @Post(":id/revisions/:revision/publish")
  @Roles("admin")
  @ApiOperation({
    description:
      "Disabled in Phase 6. Always 403. Review recommendations and JSON flags cannot authorize publication.",
  })
  publish(): never {
    throw new ForbiddenException();
  }
}
