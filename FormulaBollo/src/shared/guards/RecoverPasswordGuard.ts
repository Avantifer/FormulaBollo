import { inject, Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from "@angular/router";
import { AuthJWTService } from "../services/authJWT.service";

@Injectable()
export class RecoverPasswordGuard {

  private readonly authJWTService: AuthJWTService = inject(AuthJWTService);
  private readonly router: Router = inject(Router);

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token: string = state.url.split("/")[3];

    if ( this.authJWTService.checkTokenValid(token) && !this.authJWTService.isLogged()) {
      return true;
    } else {
      this.router.navigate(["/fantasy"]);
      return false;
    }
  }
}
