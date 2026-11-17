import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
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
    const cacheKey: string = `allConfigurations-${seasonNumber ?? "all"}`;
    
    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Configuration[]>(`${environment.apiUrl}${this.endpoint}/all`, { params }));
  }
}
