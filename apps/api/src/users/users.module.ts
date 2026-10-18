import { Controller, Get, Module } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentIdentity, type Identity } from "../auth/auth.guard";
import { publicProfile } from "../auth/auth.service";
@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
class UsersController {
  @Get("me") me(@CurrentIdentity() identity: Identity) {
    return publicProfile(identity.user);
  }
}
@Module({ controllers: [UsersController] })
export class UsersModule {}
