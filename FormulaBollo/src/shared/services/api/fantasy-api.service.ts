import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, of, tap } from "rxjs";
import { environment } from '../../../enviroments/enviroment';
import { BaseApiService } from "../baseApiService.service";
import { CacheService } from "../cache.service";
import { FantasyPointsUser } from "../../models/fantasyPointsUser";
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

  private readonly endpoint: string = "/fantasy";

  getAllPricesDriver(raceId: number): Observable<FantasyPricesDriver[]> {
    const cacheKey: string = `fantasyAllPricesDriver-${raceId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPricesDriver[]);

    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.httpClient.get<FantasyPricesDriver[]>(`${environment.apiUrl}${this.endpoint}/allDriverPrices`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getAllPricesTeam(raceId: number): Observable<FantasyPricesTeam[]> {
    const cacheKey: string = `fantasyAllPricesTeam-${raceId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPricesTeam[]);

    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.httpClient.get<FantasyPricesTeam[]>(`${environment.apiUrl}${this.endpoint}/allTeamPrices`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getDriverPoints(driverId: number): Observable<FantasyPointsDriver[]> {
    const cacheKey: string = `driverPoints-${driverId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPointsDriver[]);

    const params = this.baseApiService.createParams({ driverId: driverId });
    return this.httpClient.get<FantasyPointsDriver[]>(`${environment.apiUrl}${this.endpoint}/driverPoints`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getTeamPoints(teamId: number): Observable<FantasyPointsTeam[]> {
    const cacheKey: string = `teamPoints-${teamId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPointsTeam[]);

    const params = this.baseApiService.createParams({ teamId: teamId });
    return this.httpClient.get<FantasyPointsTeam[]>(`${environment.apiUrl}${this.endpoint}/teamPoints`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }
  
  getDriverPrices(driverId: number): Observable<FantasyPricesDriver[]> {
    const cacheKey: string = `driverPrices-${driverId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPricesDriver[]);

    const params = this.baseApiService.createParams({ driverId: driverId });
    return this.httpClient.get<FantasyPricesDriver[]>(`${environment.apiUrl}${this.endpoint}/driverPrice`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getTeamPrices(teamId: number): Observable<FantasyPricesTeam[]> {
    const cacheKey: string = `teamPrices-${teamId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPricesTeam[]);

    const params = this.baseApiService.createParams({ teamId: teamId });
    return this.httpClient.get<FantasyPricesTeam[]>(`${environment.apiUrl}${this.endpoint}/teamPrice`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getFantasyPointsSeason(season: number): Observable<FantasyPointsUser[]> {
    const cacheKey: string = `fantasyPointsSeason-${season}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPointsUser[]);

    const params = this.baseApiService.createParams({ numberSeason: season });
    return this.httpClient.get<FantasyPointsUser[]>(`${environment.apiUrl}${this.endpoint}/getFantasyPointsSeason`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getFantasyPointsRace(raceId: number): Observable<FantasyPointsUser[]> {
    const cacheKey: string = `fantasyPointsRace-${raceId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPointsUser[]);

    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.httpClient.get<FantasyPointsUser[]>(`${environment.apiUrl}${this.endpoint}/getFantasyPointsRace`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getDriverPointsSpecificRace(driverId: number, raceId: number): Observable<FantasyPointsDriver> {
    const cacheKey: string = `fantasyDriverPointsSpecificRace-${driverId}-${raceId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPointsDriver);

    const params = this.baseApiService.createParams({ driverId: driverId, raceId: raceId });
    return this.httpClient.get<FantasyPointsDriver>(`${environment.apiUrl}${this.endpoint}/driverPointsSpecificRace`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getTeamPointsSpecificRace(teamId: number, raceId: number): Observable<FantasyPointsTeam> {
    const cacheKey: string = `fantasyTeamPointsSpecificRace-${teamId}-${raceId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyPointsTeam);

    const params = this.baseApiService.createParams({ teamId: teamId, raceId: raceId });
    return this.httpClient.get<FantasyPointsTeam>(`${environment.apiUrl}${this.endpoint}/teamsPointsSpecificRace`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
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

  getFantasyElection(raceId: number, userId: number): Observable<FantasyElection> {
    const cacheKey: string = `fantasyElection-${userId}-${raceId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as FantasyElection);

    const params = this.baseApiService.createParams({ raceId: raceId, userId: userId });
    return this.httpClient.get<FantasyElection>(`${environment.apiUrl}${this.endpoint}/fantasyElection`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
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
