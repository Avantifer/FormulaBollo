import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from '../../../enviroments/enviroment';
import { Driver } from "../../models/driver";
import { DriverInfo } from "../../models/driverInfo";
import { DriverTeamHistoryEntry } from "../../models/driverTeamHistoryEntry";
import { BaseApiService } from "../baseApiService.service";
import { CacheService } from "../cache.service";

@Injectable({
  providedIn: "root",
})
export class DriverApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);
  private readonly cacheService: CacheService = inject(CacheService);

  private readonly endpoint: string = "/drivers";

  getAllDrivers(seasonNumber: number, start?: number, end?: number): Observable<Driver[]> {
    const cacheKey: string = `allDrivers-${seasonNumber}-${start ?? "all"}-${end ?? "all"}`;
    
    const params = this.baseApiService.createParams({ season: seasonNumber, page: start, size: end });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Driver[]>(`${environment.apiUrl}${this.endpoint}/all`, { params }));
  }

  getInfoByDriverName(driverName: string, seasonNumber?: number): Observable<DriverInfo> {
    const cacheKey: string = `infoByDriverName-${driverName}-${seasonNumber}`;

    const params = this.baseApiService.createParams({ driverName: driverName, season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<DriverInfo>(`${environment.apiUrl}${this.endpoint}/infoDriverByName`, { params }));
  }

  getTeamHistoryByDriverName(driverName: string): Observable<DriverTeamHistoryEntry[]> {
    const cacheKey = `teamHistoryByDriverName-${driverName}`;
    const params = this.baseApiService.createParams({ driverName });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<DriverTeamHistoryEntry[]>(`${environment.apiUrl}${this.endpoint}/teamHistory`, { params }));
  }

  getDriversByTeamName(teamName: string, seasonNumber: number): Observable<Driver[]> {
    const cacheKey: string = `driversByTeamName-${teamName}-${seasonNumber}`;

    const params = this.baseApiService.createParams({ teamName: teamName, season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Driver[]>(`${environment.apiUrl}${this.endpoint}/byTeamName`, { params }));
  }

}
