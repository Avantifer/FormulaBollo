import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, of, tap } from "rxjs";
import { environment } from '../../../enviroments/enviroment';
import { Driver } from "../../models/driver";
import { DriverInfo } from "../../models/driverInfo";
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
    const cacheKey: string = `allDrivers-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Driver[]);
    
    const params = this.baseApiService.createParams({ season: seasonNumber, page: start, size: end });
    return this.httpClient.get<Driver[]>(`${environment.apiUrl}${this.endpoint}/all`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data);  
        this.cacheService.saveCache();
      })
    );
  }

  getInfoByDriverName(driverName: string, seasonNumber?: number): Observable<DriverInfo> {
    const cacheKey: string = `infoByDriverName-${driverName}-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as DriverInfo);

    const params = this.baseApiService.createParams({ driverName: driverName, season: seasonNumber });
    return this.httpClient.get<DriverInfo>(`${environment.apiUrl}${this.endpoint}/infoDriverByName`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getDriversByTeamName(teamName: string, seasonNumber: number): Observable<Driver[]> {
    const cacheKey: string = `driversByTeamName-${teamName}-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Driver[]);

    const params = this.baseApiService.createParams({ teamName: teamName, season: seasonNumber });
    return this.httpClient.get<Driver[]>(`${environment.apiUrl}${this.endpoint}/byTeamName`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getAllInfoDrivers(seasonNumber?: number): Observable<DriverInfo[]> {
    const cacheKey: string = `allInfoDrivers-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as DriverInfo[]);

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.httpClient.get<DriverInfo[]>(`${environment.apiUrl}${this.endpoint}/allInfoDriver`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getRecordsDrivers(): Observable<Record[]> {
    const cacheKey: string = `recordsDrivers-${0}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Record[]);

    return this.httpClient.get<Record[]>(`${environment.apiUrl}${this.endpoint}/recordsDrivers`).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getEvolutionPointsDrivers(driver1Id: number, driver2Id: number, driver3Id: number, driver4Id: number, season: number): Observable<DriverEvolutionPoints[]> {
    const cacheKey: string = `evolutionDrivers-${driver1Id}-${driver2Id}-${driver3Id}-${driver4Id}-${season}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as DriverEvolutionPoints[]);

    const params = this.baseApiService.createParams({ driver1Id: driver1Id, driver2Id: driver2Id, driver3Id: driver3Id, driver4Id: driver4Id });
    return this.httpClient.get<DriverEvolutionPoints[]>(`${environment.apiUrl}${this.endpoint}/evolutionPoints`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }
}
