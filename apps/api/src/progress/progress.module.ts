import { Body, Controller, Get, Inject, Module, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { CurrentIdentity, type Identity } from "../auth/auth.guard";
import { bodyValidation } from "../common/http";
import { PaginationDto } from "../common/pagination";
import { ScenariosModule } from "../scenarios/scenarios.module";
import { AttemptDto } from "./progress.dto";
import { ProgressService } from "./progress.service";
@ApiTags("progress")
@ApiBearerAuth()
@Controller("progress")
class ProgressController {
  constructor(@Inject(ProgressService) private readonly progress: ProgressService) {}
  @Post("attempts")
  @ApiBody({ type: AttemptDto })
  submit(
    @CurrentIdentity() identity: Identity,
    @Body(bodyValidation(AttemptDto)) body: AttemptDto,
  ) {
    return this.progress.submit(identity.user.id, body);
  }
  @Get("attempts") history(
    @CurrentIdentity() identity: Identity,
    @Query(bodyValidation(PaginationDto)) page: PaginationDto,
  ) {
    return this.progress.history(identity.user.id, page);
  }
  @Get() summary(@CurrentIdentity() identity: Identity) {
    return this.progress.summary(identity.user.id);
  }
}
@Module({
  imports: [ScenariosModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
