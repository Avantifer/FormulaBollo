import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { AuthJWTService } from "../services/authJWT.service";
import { MessageInfoService } from "../services/toastInfo.service";
import { WARNING_NO_LOGIN } from "../../app/constants";

@Injectable()
export class FantasyTeamGuard {

  private readonly authJWTService: AuthJWTService = inject(AuthJWTService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly router: Router = inject(Router);

  canActivate(): boolean {
    if (!this.authJWTService.isLogged()) {
      this.messageInfoService.showWarn(WARNING_NO_LOGIN);
      this.router.navigate(["/fantasy/login"]);
      return false;
    } else {
      return true;
    }
  }
}
