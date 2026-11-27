import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
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
    
    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Penalty[]>(`${environment.apiUrl}${this.endpoint}/totalPerRace`, { params }));
  }

  getPenaltiesPerDriver(): Observable<Penalty[]> {
    const cacheKey: string = `PenaltiesTotalPerDriver-0`;
    
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Penalty[]>(`${environment.apiUrl}${this.endpoint}/totalPerDriver`));
  }

  getPenaltiesPerDriverAndPerRace(driverId: number, raceId: number, severityId: number): Observable<Penalty[]> {    
    const params = this.baseApiService.createParams({ driverId: driverId, raceId: raceId, severityId: severityId });
    return this.httpClient.get<Penalty[]>(`${environment.apiUrl}${this.endpoint}/perDriverPerRace`, { params });
  }

  savePenalties(penalties: Penalty[], driverId: number, raceId: number, severityId: number): Observable<string> {
    this.cacheService.clearCache();
    
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      'Authorization': `Bearer ${localStorage.getItem('auth')}`,
      Accept: "text/plain",
    });
     const params = this.baseApiService.createParams({ driverId: driverId, raceId: raceId, severityId: severityId });
    return this.httpClient.put<string>(`${environment.apiUrl}${this.endpoint}/save`, penalties, { params, headers, responseType: "text" as "json" });
  }
}
