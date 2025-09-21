import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, of, tap } from "rxjs";
import { environment } from '../../../enviroments/enviroment';
import { BaseApiService } from "../baseApiService.service";
import { CacheService } from "../cache.service";
import { Penalty } from "../../models/penalty";

@Injectable({
  providedIn: "root",
})
export class PenaltiesApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);
  private readonly cacheService: CacheService = inject(CacheService);

  private readonly endpoint: string = "/penalties";

  getPenaltiesByRace(raceId: number): Observable<Penalty[]> {
    const cacheKey: string = `PenaltiesTotalPerRace-${raceId}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Penalty[]);
    
    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.httpClient.get<Penalty[]>(`${environment.apiUrl}${this.endpoint}/totalPerRace`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getPenaltiesPerDriver(): Observable<Penalty[]> {
    const cacheKey: string = `PenaltiesTotalPerDriver-0`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Penalty[]);
    
    return this.httpClient.get<Penalty[]>(`${environment.apiUrl}${this.endpoint}/totalPerDriver`).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getPenaltiesPerDriverAndPerRace(driverId: number, raceId: number, severityId: number): Observable<Penalty[]> {    
    const params = this.baseApiService.createParams({ driverId: driverId, raceId: raceId, severityId: severityId });
    return this.httpClient.get<Penalty[]>(`${environment.apiUrl}${this.endpoint}/perDriverPerRace`, { params });
  }

  savePenalties(penalties: Penalty[], driverId: number, raceId: number): Observable<string> {
    this.cacheService.clearCache();
    
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      'Authorization': `Bearer ${localStorage.getItem('auth')}`,
      Accept: "text/plain",
    });
     const params = this.baseApiService.createParams({ driverId: driverId, raceId: raceId });
    return this.httpClient.put<string>(`${environment.apiUrl}${this.endpoint}/save`, penalties, { params, headers, responseType: "text" as "json" });
  }
}