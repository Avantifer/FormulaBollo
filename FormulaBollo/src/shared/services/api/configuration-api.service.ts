import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, of, tap } from "rxjs";
import { environment } from "../../../enviroments/enviroment";
import { BaseApiService } from "../baseApiService.service";
import { Configuration } from "../../models/configuration";
import { CacheService } from "../cache.service";

@Injectable({
  providedIn: "root",
})
export class ConfigurationApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);
  private readonly cacheService: CacheService = inject(CacheService);

  private readonly endpoint: string = "/configurations";

  getAllConfigurations(seasonNumber?: number): Observable<Configuration[]> {
    const cacheKey: string = `allConfigurations`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Configuration[]);
    
    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.httpClient.get<Configuration[]>(`${environment.apiUrl}${this.endpoint}/all`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);
        this.cacheService.saveCache();
      })
    );
  }
}
