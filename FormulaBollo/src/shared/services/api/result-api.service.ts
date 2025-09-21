import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, of, tap } from "rxjs";
import { DriverPoints } from "../../models/driverPoints";
import { environment } from "../../../enviroments/enviroment";
import { Result } from "../../models/result";
import { BaseApiService } from "../baseApiService.service";
import { ResultTeam } from "../../models/resultTeam";
import { CacheService } from "../cache.service";

@Injectable({
  providedIn: "root",
})
export class ResultApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);
  private readonly cacheService: CacheService = inject(CacheService);

  private readonly endpoint: string = "/results";

  getAllDriverPoints(seasonNumber: number, numResults?: number): Observable<DriverPoints[]> {
    const cacheKey: string = `allDriverPoints-${seasonNumber}-${numResults}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as DriverPoints[]);

    const params = this.baseApiService.createParams({ season: seasonNumber, numResults: numResults});
    return this.httpClient.get<DriverPoints[]>(`${environment.apiUrl}${this.endpoint}/totalPerDriver`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getSpecificDriversPoints(seasonNumber: number, driverIds: number[]): Observable<DriverPoints[]> {
    const cacheKey: string = `specificDriverPoints-${seasonNumber}-${driverIds}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as DriverPoints[]);

    const params = this.baseApiService.createParams({ season: seasonNumber });
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    return this.httpClient.post<DriverPoints[]>(`${environment.apiUrl}${this.endpoint}/totalPerSpecificDrivers`, driverIds, { headers, params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getAllResultsPerRacePilots(raceId: number): Observable<Result[]> {
    const cacheKey: string = `allResultsPerRacePilots-${raceId}-0`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Result[]);

    const params = this.baseApiService.createParams({ raceId: raceId});
    return this.httpClient.get<Result[]>(`${environment.apiUrl}${this.endpoint}/raceByPilots`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getAllResultsPerRaceTeams(raceId: number): Observable<ResultTeam[]> {
    const cacheKey: string = `allResultsPerRaceTeams-${raceId}-0`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as ResultTeam[]);

    const params = this.baseApiService.createParams({ raceId: raceId});
    return this.httpClient.get<ResultTeam[]>(`${environment.apiUrl}${this.endpoint}/raceByTeams`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  saveResults(results: Result[]): Observable<string> {
    this.cacheService.clearCache();
    
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      'Authorization': `Bearer ${localStorage.getItem('auth')}`,
      Accept: "text/plain",
    });
    
    return this.httpClient.put<string>(`${environment.apiUrl}${this.endpoint}/save`, results, { headers, responseType: "text" as "json" });
  }

  deleteResultsFromRace(raceId: number): Observable<string> {
    this.cacheService.clearCache();

    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem('auth')}`,
      "Accept": "text/plain",
    });

    const params = this.baseApiService.createParams({ raceId });

    return this.httpClient.delete<string>(`${environment.apiUrl}${this.endpoint}/delete`, { headers, params, responseType: "text" as "json"}
    );
  }
}
