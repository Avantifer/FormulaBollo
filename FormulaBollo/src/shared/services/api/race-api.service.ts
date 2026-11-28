import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { BaseApiService } from "../baseApiService.service";
import { Race } from "../../models/race";
import { Result } from "../../models/result";
import { environment } from "../../../enviroments/enviroment";
import { Observable } from "rxjs";
import { CacheService } from "../cache.service";

@Injectable({
  providedIn: "root",
})
export class RaceApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);
  private readonly cacheService: CacheService = inject(CacheService);
  
  private readonly endpoint: string = "/races";

  getAllRaces(seasonNumber: number): Observable<Race[]> {
    const cacheKey: string = `allRaces-${seasonNumber}`;

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Race[]>(`${environment.apiUrl}${this.endpoint}/all`, { params }));
  }

  getActualRace(seasonNumber: number): Observable<Race> {
    const cacheKey: string = `actualRace-${seasonNumber}`;

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Race>(`${environment.apiUrl}${this.endpoint}/actual`, { params }));
  }

  getAllRacesFinishedAndActual(seasonNumber: number): Observable<Race[]> {
    const cacheKey: string = `allRacesFinishedAndActual-${seasonNumber}`;

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Race[]>(`${environment.apiUrl}${this.endpoint}/allFinishedAndActual`, { params }));
  }

  saveRace(race: Race): Observable<string> {
    this.cacheService.clearCache();

    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      'Authorization': `Bearer ${localStorage.getItem('auth')}`,
      Accept: "text/plain",
    });
    return this.httpClient.put<string>(`${environment.apiUrl}${this.endpoint}/save`, race, { headers, responseType: "text" as "json" });
  }

  closeRace(race: Race, results: Result[]): Observable<string> {
    this.cacheService.clearCache();

    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      'Authorization': `Bearer ${localStorage.getItem('auth')}`,
      Accept: "text/plain",
    });
    return this.httpClient.put<string>(`${environment.apiUrl}${this.endpoint}/close`, { race, results }, { headers, responseType: "text" as "json" });
  }
}
