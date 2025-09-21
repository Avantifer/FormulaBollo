import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, of, tap } from "rxjs";
import { environment } from '../../../enviroments/enviroment';
import { BaseApiService } from "../baseApiService.service";
import { Team } from "../../models/team";
import { TeamWithDrivers } from "../../models/teamWithDrivers";
import { TeamInfo } from "../../models/teamInfo";
import { CacheService } from "../cache.service";
import { TeamEvolutionPoints } from "../../models/teamEvolutionPoints";

@Injectable({
  providedIn: "root",
})
export class TeamApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);
  private readonly cacheService: CacheService = inject(CacheService);

  private readonly endpoint: string = "/teams";

  getAllTeams(seasonNumber: number): Observable<Team[]> {
    const cacheKey: string = `allTeams-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as Team[]);

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.httpClient.get<Team[]>(`${environment.apiUrl}${this.endpoint}/all`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getllTeamsWithDrivers(seasonNumber: number): Observable<TeamWithDrivers[]> {
    const cacheKey: string = `allTeamsWithDrivers-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as TeamWithDrivers[]);

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.httpClient.get<TeamWithDrivers[]>(`${environment.apiUrl}${this.endpoint}/withDrivers`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getInfoTeamByName(teamName: string, seasonNumber?: number): Observable<TeamInfo> {
    const cacheKey: string = `infoTeamByName-${teamName}-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as TeamInfo);

    const params = this.baseApiService.createParams({ teamName: teamName, season: seasonNumber });
    return this.httpClient.get<TeamInfo>(`${environment.apiUrl}${this.endpoint}/infoTeamByName`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getAllInfoTeam(seasonNumber?: number): Observable<TeamInfo[]> {
    const cacheKey: string = `allInfoTeam-${seasonNumber}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as TeamInfo[]);

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.httpClient.get<TeamInfo[]>(`${environment.apiUrl}${this.endpoint}/allInfoTeam`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }

  getEvolutionPointsTeams(team1Id: number, team2Id: number, team3Id: number, team4Id: number, season: number): Observable<TeamEvolutionPoints[]> {
    const cacheKey: string = `evolutionTeams-${team1Id}-${team2Id}-${team3Id}-${team4Id}-${season}`;
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as TeamEvolutionPoints[]);

    const params = this.baseApiService.createParams({ team1Id: team1Id, team2Id: team2Id, team3Id: team3Id, team4Id: team4Id });
    return this.httpClient.get<TeamEvolutionPoints[]>(`${environment.apiUrl}${this.endpoint}/evolutionPoints`, { params }).pipe(
      tap(data => {
        cache.set(cacheKey, data)
        this.cacheService.saveCache();
      })
    );
  }
}