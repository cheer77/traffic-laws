import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { bodyValidation } from "../common/http";
import { CredentialsDto } from "./auth.dto";
import { AuthService } from "./auth.service";
import { CurrentIdentity, Public, type Identity } from "./auth.guard";
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Public()
  @Post("register")
  @ApiBody({ type: CredentialsDto })
  register(@Body(bodyValidation(CredentialsDto)) body: CredentialsDto) {
    return this.auth.register(body);
  }
  @Public()
  @Post("login")
  @HttpCode(200)
  @ApiBody({ type: CredentialsDto })
  login(@Body(bodyValidation(CredentialsDto)) body: CredentialsDto) {
    return this.auth.login(body);
  }
  @Post("logout")
  @HttpCode(200)
  @ApiBearerAuth()
  logout(@CurrentIdentity() identity: Identity) {
    return this.auth.logout(identity.sessionId);
  }
}
