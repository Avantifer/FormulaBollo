import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from '../../../enviroments/enviroment';
import { BaseApiService } from "../baseApiService.service";
import { Team } from "../../models/team";
import { TeamWithDrivers } from "../../models/teamWithDrivers";
import { TeamInfo } from "../../models/teamInfo";
import { CacheService } from "../cache.service";

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

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<Team[]>(`${environment.apiUrl}${this.endpoint}/all`, { params }));
  }

  getllTeamsWithDrivers(seasonNumber: number): Observable<TeamWithDrivers[]> {
    const cacheKey: string = `allTeamsWithDrivers-${seasonNumber}`;

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<TeamWithDrivers[]>(`${environment.apiUrl}${this.endpoint}/withDrivers`, { params }));
  }

  getInfoTeamByName(teamName: string, seasonNumber?: number): Observable<TeamInfo> {
    const cacheKey: string = `infoTeamByName-${teamName}-${seasonNumber}`;

    const params = this.baseApiService.createParams({ teamName: teamName, season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<TeamInfo>(`${environment.apiUrl}${this.endpoint}/infoTeamByName`, { params }));
  }

  getAllInfoTeam(seasonNumber?: number): Observable<TeamInfo[]> {
    const cacheKey: string = `allInfoTeam-${seasonNumber}`;

    const params = this.baseApiService.createParams({ season: seasonNumber });
    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<TeamInfo[]>(`${environment.apiUrl}${this.endpoint}/allInfoTeam`, { params }));
  }
}
