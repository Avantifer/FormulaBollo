import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, of, tap } from "rxjs";
import { environment } from "../../../enviroments/enviroment";
import { BaseApiService } from "../baseApiService.service";
import { Season } from "../../models/season";
import { CacheService } from "../cache.service";

@Injectable({
  providedIn: "root",
})
export class SeasonApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);
  private readonly cacheService: CacheService = inject(CacheService);

  private readonly endpoint: string = "/seasons";
  
  getSeasons(): Observable<Season[]> {
    const cacheKey: string = `allSeasons`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Season[]);
    
    return this.httpClient.get<Season[]>(`${environment.apiUrl}${this.endpoint}/all`).pipe(
      tap(data => {
        cache.set(cacheKey, data);
        this.cacheService.saveCache();
      })
    );
  }

  getActualSeason(): Observable<Season> {
    const cacheKey: string = `actualSeason`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Season);

    return this.httpClient.get<Season>(`${environment.apiUrl}${this.endpoint}/actual`).pipe(
      tap(data => {
        cache.set(cacheKey, data);
        this.cacheService.saveCache();
      })
    );
  }

  getSeasonByDriverName(driverName: string): Observable<Season[]> {
    const cacheKey: string = `seasonsByDriverName-${driverName}-0`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Season[]);

    const params = this.baseApiService.createParams({ driverName: driverName })
    return this.httpClient.get<Season[]>(`${environment.apiUrl}${this.endpoint}/byDriverName`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);
        this.cacheService.saveCache();
      })
    );
  }

  getSeasonByTeamName(teamName: string): Observable<Season[]> {
    const cacheKey: string = `seasonsByTeamName-${teamName}-0`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Season[]);

    const params = this.baseApiService.createParams({ teamName: teamName })
    return this.httpClient.get<Season[]>(`${environment.apiUrl}${this.endpoint}/byTeamName`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);
        this.cacheService.saveCache();
      })
    );
  }
  getSeasonOfFantasy(): Observable<Season[]> {
    const cacheKey: string = `seasonsOfFantasy`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Season[]);

    return this.httpClient.get<Season[]>(`${environment.apiUrl}${this.endpoint}/fantasy`).pipe(
      tap(data => {
        cache.set(cacheKey, data);
        this.cacheService.saveCache();
      })
    );
  }
}
