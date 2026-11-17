import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
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
    
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Season[]>(`${environment.apiUrl}${this.endpoint}/all`));
  }

  getActualSeason(): Observable<Season> {
    const cacheKey: string = `actualSeason`;

    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Season>(`${environment.apiUrl}${this.endpoint}/actual`));
  }

  getSeasonByDriverName(driverName: string): Observable<Season[]> {
    const cacheKey: string = `seasonsByDriverName-${driverName}-0`;

    const params = this.baseApiService.createParams({ driverName: driverName })
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Season[]>(`${environment.apiUrl}${this.endpoint}/byDriverName`, { params }));
  }

  getSeasonByTeamName(teamName: string): Observable<Season[]> {
    const cacheKey: string = `seasonsByTeamName-${teamName}-0`;

    const params = this.baseApiService.createParams({ teamName: teamName })
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Season[]>(`${environment.apiUrl}${this.endpoint}/byTeamName`, { params }));
  }
  getSeasonOfFantasy(): Observable<Season[]> {
    const cacheKey: string = `seasonsOfFantasy`;

    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Season[]>(`${environment.apiUrl}${this.endpoint}/fantasy`));
  }
}
