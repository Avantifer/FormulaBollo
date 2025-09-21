import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { BaseApiService } from "../baseApiService.service";
import { Race } from "../../models/race";
import { environment } from "../../../enviroments/enviroment";
import { Observable, of, tap } from "rxjs";
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
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Race[]);

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.httpClient.get<Race[]>(`${environment.apiUrl}${this.endpoint}/all`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getAllRacesFinished(seasonNumber: number): Observable<Race[]> {
    const cacheKey: string = `allRacesFinished-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Race[]);

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.httpClient.get<Race[]>(`${environment.apiUrl}${this.endpoint}/allFinished`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getActualRace(seasonNumber: number): Observable<Race> {
    const cacheKey: string = `actualRace-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Race);

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.httpClient.get<Race>(`${environment.apiUrl}${this.endpoint}/actual`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);
        this.cacheService.saveCache();
      })
    );
  }

  getAllRacesFinishedAndActual(seasonNumber: number): Observable<Race[]> {
    const cacheKey: string = `allRacesFinishedAndActual-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Race[]);

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.httpClient.get<Race[]>(`${environment.apiUrl}${this.endpoint}/allFinishedAndActual`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
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
}