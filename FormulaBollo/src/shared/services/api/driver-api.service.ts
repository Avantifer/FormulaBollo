import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from '../../../enviroments/enviroment';
import { Driver } from "../../models/driver";
import { DriverInfo } from "../../models/driverInfo";
import { DriverTeamHistoryEntry } from "../../models/driverTeamHistoryEntry";
import { BaseApiService } from "../baseApiService.service";
import { CacheService } from "../cache.service";
import { Record } from "../../models/record";
import { DriverEvolutionPoints } from "../../models/driverEvolutionPoints";

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

  getAllInfoDrivers(seasonNumber?: number): Observable<DriverInfo[]> {
    const cacheKey: string = `allInfoDrivers-${seasonNumber}`;

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<DriverInfo[]>(`${environment.apiUrl}${this.endpoint}/allInfoDriver`, { params }));
  }

  getRecordsDrivers(): Observable<Record[]> {
    const cacheKey: string = `recordsDrivers-${0}`;

    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Record[]>(`${environment.apiUrl}${this.endpoint}/recordsDrivers`));
  }

  getEvolutionPointsDrivers(driver1Id: number, driver2Id: number, driver3Id: number, driver4Id: number, season: number): Observable<DriverEvolutionPoints[]> {
    const cacheKey: string = `evolutionDrivers-${driver1Id}-${driver2Id}-${driver3Id}-${driver4Id}-${season}`;

    const params = this.baseApiService.createParams({ driver1Id: driver1Id, driver2Id: driver2Id, driver3Id: driver3Id, driver4Id: driver4Id });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<DriverEvolutionPoints[]>(`${environment.apiUrl}${this.endpoint}/evolutionPoints`, { params }));
  }
}
