import { inject, Injectable } from "@angular/core";
import { JwtHelperService } from "@auth0/angular-jwt";
import { MessageInfoService } from "./toastInfo.service";
import { Account } from "../models/account";

@Injectable({
  providedIn: "root"
})
export class AuthJWTService {

  private readonly jwtService: JwtHelperService = inject(JwtHelperService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  
  isUserLogged: boolean = false;

  /**
   * Checks if the user associated with the given JWT token is an admin.
   * @param jwt - The JWT token to check.
   * @returns A boolean indicating whether the user is an admin or not.
   */
  checkAdmin(jwt: string): boolean {
    if (!this.checkTokenValid(jwt)) return false;
    let isAdmin: boolean = false;
    const token: Account | null = this.jwtService.decodeToken(jwt);

    if (token?.admin) isAdmin = true;

    return isAdmin;
  }

  /**
   * Checks if a JWT token is valid.
   * @param token - The JWT token to be checked.
   * @returns A boolean indicating whether the token is valid or not.
   */
  checkTokenValid(token: string | null | undefined): boolean {
    try {
      if (!token || token.split('.').length !== 3) return false;
      const parts = token.split('.');
      if (!parts.every(part => /^[A-Za-z0-9_-]+={0,2}$/.test(part))) return false;
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof header?.alg !== 'string' || header.alg.toLowerCase() === 'none') return false;
      const tokenDecoded = this.jwtService.decodeToken(token);
      return !!tokenDecoded?.userId && typeof tokenDecoded.exp === 'number'
        && Number.isFinite(tokenDecoded.exp) && tokenDecoded.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  /**
   * Returns the id from a JWT token.
   * @param token - The JWT token.
   * @returns The id extracted from the token.
   */
  getIdFromToken(token: string): string {
    if (!this.checkTokenValid(token)) return '';
    let id: string = "";
    const tokenDecoded = this.jwtService.decodeToken(token);

    if (tokenDecoded.userId) id = tokenDecoded.userId;

    return id;
  }

  /**
   * Returns the username from a JWT token.
   * @param token - The JWT token.
   * @returns The username extracted from the token.
   */
  getUsernameFromToken(token: string): string {
    if (!this.checkTokenValid(token)) return '';
    let username: string = "";
    const tokenDecoded = this.jwtService.decodeToken(token);

    if (tokenDecoded.sub) username = tokenDecoded.sub;

    return username;
  }

  /**
   * Checks if the user is currently logged in by verifying the presence of a JWT token in local storage.
   * @returns Returns true if the user is logged in, false otherwise.
   */
  isLogged(): boolean {
    let isLogged: boolean = false;
    const token: string | null = localStorage.getItem("auth");

    isLogged = this.checkTokenValid(token);
    if (!isLogged) this.clearSession();
    this.isUserLogged = isLogged;
    return isLogged;
  }

  /**
   * Removes the "auth" item from local storage, navigates to the login page, and displays a success message.
   */
  logOut(): void {
    this.clearSession();
    this.messageInfoService.showInfo("Has cerrado sesión correctamente");
  }

  clearSession(): void {
    localStorage.removeItem('auth');
    this.isUserLogged = false;
  }
}
