import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
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

    const params = this.baseApiService.createParams({ season: seasonNumber, numResults: numResults});
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<DriverPoints[]>(`${environment.apiUrl}${this.endpoint}/totalPerDriver`, { params }));
  }

  getSpecificDriversPoints(seasonNumber: number, driverIds: number[]): Observable<DriverPoints[]> {
    const cacheKey: string = `specificDriverPoints-${seasonNumber}-${driverIds}`;

    const params = this.baseApiService.createParams({ season: seasonNumber });
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.post<DriverPoints[]>(`${environment.apiUrl}${this.endpoint}/totalPerSpecificDrivers`, driverIds, { headers, params }));
  }

  getAllResultsPerRacePilots(raceId: number): Observable<Result[]> {
    const cacheKey: string = `allResultsPerRacePilots-${raceId}-0`;

    const params = this.baseApiService.createParams({ raceId: raceId});
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Result[]>(`${environment.apiUrl}${this.endpoint}/raceByPilots`, { params }));
  }

  getAllResultsPerRaceTeams(raceId: number): Observable<ResultTeam[]> {
    const cacheKey: string = `allResultsPerRaceTeams-${raceId}-0`;

    const params = this.baseApiService.createParams({ raceId: raceId});
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<ResultTeam[]>(`${environment.apiUrl}${this.endpoint}/raceByTeams`, { params }));
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
