import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { AuthJWTService } from "../services/authJWT.service";
import { MessageInfoService } from "../services/toastInfo.service";
import { WARNING_NO_ADMIN } from "../../app/constants";
@Injectable()
export class AdminGuard {

  private readonly authJWTService: AuthJWTService = inject(AuthJWTService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly router: Router = inject(Router);

  canActivate(): boolean  {
    if (localStorage.getItem("auth")) {
      if (this.authJWTService.checkAdmin(localStorage.getItem("auth")!)) {
        return true;
      } else {
        this.router.navigate(["/"]);
        this.messageInfoService.showError(WARNING_NO_ADMIN, null);
        return false;
      }
    } else {
      this.router.navigate(["/login"]);
      return false;
    }
  }
}
