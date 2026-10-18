import { RevisionPipe } from "../common/revision.pipe";
import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentIdentity, Public, Roles, type Identity } from "../auth/auth.guard";
import { bodyValidation } from "../common/http";
import { PaginationDto } from "../common/pagination";
import { DraftDto, InternalScenarioQueryDto, PublicationDto, ReviewDto } from "./scenarios.dto";
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
  @Get()
  @ApiOperation({ description: "Paginated staff-only revision metadata, newest first." })
  list(@Query(bodyValidation(InternalScenarioQueryDto)) query: InternalScenarioQueryDto) {
    return this.scenarios.listInternal(query);
  }
  @Get(":id/revisions")
  @ApiOperation({ description: "Paginated immutable revision history for one scenario." })
  history(@Param("id") id: string, @Query(bodyValidation(PaginationDto)) page: PaginationDto) {
    return this.scenarios.history(id, page);
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
  @ApiBody({ type: PublicationDto })
  @ApiCreatedResponse({ description: "Revision published." })
  @ApiOperation({ description: "Publish one immutable revision by an active administrator." })
  publish(
    @Param("id") id: string,
    @Param("revision", RevisionPipe) revision: number,
    @Body(bodyValidation(PublicationDto)) body: PublicationDto,
    @CurrentIdentity() identity: Identity,
  ) {
    return this.scenarios.publish(id, revision, body.evidence, identity.user.id);
  }
  @Post(":id/revisions/:revision/unpublish")
  @Roles("admin")
  @ApiBody({ type: PublicationDto })
  @ApiCreatedResponse({ description: "Revision withdrawn." })
  @ApiOperation({ description: "Withdraw one published revision while retaining an audit event." })
  unpublish(
    @Param("id") id: string,
    @Param("revision", RevisionPipe) revision: number,
    @Body(bodyValidation(PublicationDto)) body: PublicationDto,
    @CurrentIdentity() identity: Identity,
  ) {
    return this.scenarios.unpublish(id, revision, body.evidence, identity.user.id);
  }
}
