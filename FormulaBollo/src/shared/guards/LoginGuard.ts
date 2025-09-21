import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { AuthJWTService } from "../services/authJWT.service";

@Injectable()
export class LoginGuard {

  private readonly authJWTService: AuthJWTService = inject(AuthJWTService);
  private readonly router: Router = inject(Router);

  canActivate(): boolean  {
    if (this.authJWTService.isLogged()) {
      this.router.navigate(["/"]);
      return false;
    } else {
      return true;
    }
  }
}
