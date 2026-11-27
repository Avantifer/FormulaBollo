import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, throwError } from "rxjs";
import { AuthJWTService } from '../authJWT.service';
import { environment } from '../../../enviroments/enviroment';
import { BaseApiService } from "../baseApiService.service";
import { CacheService } from "../cache.service";
import { FantasyClasificationDTO } from '../../models/fantasy-clasification';
import { FantasyPointsDriver } from "../../models/fantasyPointsDriver";
import { FantasyPointsTeam } from "../../models/fantasyPointsTeam";
import { FantasyPricesDriver } from "../../models/fantasyPricesDriver";
import { FantasyPricesTeam } from "../../models/fantasyPricesTeam";
import { FantasyElection } from "../../models/fantasyElection";

@Injectable({
  providedIn: "root",
})
export class FantasyApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);
  private readonly cacheService: CacheService = inject(CacheService);
  private readonly auth: AuthJWTService = inject(AuthJWTService);

  private readonly endpoint: string = "/fantasy";

  getAllPricesDriver(raceId: number): Observable<FantasyPricesDriver[]> {
    const cacheKey: string = `fantasyAllPricesDriver-${raceId}`;

    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<FantasyPricesDriver[]>(`${environment.apiUrl}${this.endpoint}/allDriverPrices`, { params }));
  }

  getAllPricesTeam(raceId: number): Observable<FantasyPricesTeam[]> {
    const cacheKey: string = `fantasyAllPricesTeam-${raceId}`;

    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<FantasyPricesTeam[]>(`${environment.apiUrl}${this.endpoint}/allTeamPrices`, { params }));
  }

  getDriverPoints(driverId: number): Observable<FantasyPointsDriver[]> {
    const cacheKey: string = `driverPoints-${driverId}`;

    const params = this.baseApiService.createParams({ driverId: driverId });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<FantasyPointsDriver[]>(`${environment.apiUrl}${this.endpoint}/driverPoints`, { params }));
  }

  getTeamPoints(teamId: number): Observable<FantasyPointsTeam[]> {
    const cacheKey: string = `teamPoints-${teamId}`;

    const params = this.baseApiService.createParams({ teamId: teamId });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<FantasyPointsTeam[]>(`${environment.apiUrl}${this.endpoint}/teamPoints`, { params }));
  }
  
  getDriverPrices(driverId: number): Observable<FantasyPricesDriver[]> {
    const cacheKey: string = `driverPrices-${driverId}`;

    const params = this.baseApiService.createParams({ driverId: driverId });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<FantasyPricesDriver[]>(`${environment.apiUrl}${this.endpoint}/driverPrice`, { params }));
  }

  getTeamPrices(teamId: number): Observable<FantasyPricesTeam[]> {
    const cacheKey: string = `teamPrices-${teamId}`;

    const params = this.baseApiService.createParams({ teamId: teamId });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<FantasyPricesTeam[]>(`${environment.apiUrl}${this.endpoint}/teamPrice`, { params }));
  }

  getFantasyClasification(season: number): Observable<FantasyClasificationDTO> {
    const cacheKey = 'fantasyClasification-v1-' + season;
    const params = this.baseApiService.createParams({ numberSeason: season });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<FantasyClasificationDTO>(`${environment.apiUrl}${this.endpoint}/clasification`, { params }));
  }

  saveDriverTeamPoints(raceId: number): Observable<string> {
    this.cacheService.clearCache();
    
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      'Authorization': `Bearer ${localStorage.getItem('auth')}`,
      Accept: "text/plain",
    });

    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.httpClient.post<string>(`${environment.apiUrl}${this.endpoint}/saveDriverTeamPoints`, {}, { params, headers, responseType: "text" as "json" });
  }

  getFantasyElection(raceId: number): Observable<FantasyElection> {
    const token = localStorage.getItem('auth');
    if (!this.auth.isLogged() || !token) return throwError(() => new Error('La sesión no es válida'));
    const params = this.baseApiService.createParams({ raceId: raceId });
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.httpClient.get<FantasyElection>(`${environment.apiUrl}${this.endpoint}/fantasyElection`, { params, headers });
  }


  saveDriverTeamPrices(raceId: number): Observable<string> {
    this.cacheService.clearCache();
    
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      'Authorization': `Bearer ${localStorage.getItem('auth')}`,
      Accept: "text/plain",
    });

    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.httpClient.post<string>(`${environment.apiUrl}${this.endpoint}/saveDriverTeamPrices`, {}, { params, headers, responseType: "text" as "json" });
  }
}
