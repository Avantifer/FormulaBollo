import { HttpClient, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../enviroments/enviroment";
import { BaseApiService } from "../baseApiService.service";
import { CacheService } from "../cache.service";
import { Sprint } from "../../models/sprint";

@Injectable({
  providedIn: "root",
})
export class SprintApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);
  private readonly cacheService: CacheService = inject(CacheService);

  private readonly endpoint: string = "/sprints";

  getAllSprintPerRace(raceId: number): Observable<Sprint[]> {
    const cacheKey: string = `allSprintPerRace-${raceId}-0`;

    const params = this.baseApiService.createParams({ raceId: raceId });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Sprint[]>(`${environment.apiUrl}${this.endpoint}/race`, { params }));
  }

  saveSprints(sprints: Sprint[]): Observable<string> {
    this.cacheService.clearCache();
    
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      'Authorization': `Bearer ${localStorage.getItem('auth')}`,
      Accept: "text/plain",
    });
    
    return this.httpClient.put<string>(`${environment.apiUrl}${this.endpoint}/save`, sprints, { headers, responseType: "text" as "json" });
  }

  deleteSprintsFromRace(raceId: number): Observable<string> {
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
