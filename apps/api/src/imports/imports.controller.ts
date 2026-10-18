import { Controller, Get, Inject, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentIdentity, Roles, type Identity } from "../auth/auth.guard";
import { ImportsService } from "./imports.service";

@ApiTags("internal-imports")
@ApiBearerAuth()
@Roles("admin", "reviewer")
@Controller("internal/imports")
export class ImportsController {
  constructor(@Inject(ImportsService) private readonly imports: ImportsService) {}

  @Get()
  @ApiOperation({ description: "Official question-bank source status and immutable import log." })
  overview() {
    return this.imports.overview();
  }

  @Post("sync")
  @Roles("admin")
  @ApiOperation({
    description: "Recheck the official source; never bypasses access or reuse limits.",
  })
  sync(@CurrentIdentity() identity: Identity) {
    return this.imports.sync(identity.user.id);
  }

  @Post("publish")
  @Roles("admin")
  @ApiOperation({ description: "Bulk publication gate; disabled while reuse rights are unclear." })
  publish() {
    return this.imports.publish();
  }
}
