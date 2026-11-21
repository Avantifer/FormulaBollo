import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { StatisticsOverview } from '../../models/statistics';
import { BaseApiService } from '../baseApiService.service';
import { CacheService } from '../cache.service';

@Injectable({ providedIn: 'root' })
export class StatisticsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseApiService = inject(BaseApiService);
  private readonly cacheService = inject(CacheService);

  getOverview(season: number): Observable<StatisticsOverview> {
    const params = this.baseApiService.createParams({ season });
    // Increment v2 if the overview response shape changes again.
    return this.cacheService.getOrLoad('statisticsOverview-v2-' + season, () =>
      this.httpClient.get<StatisticsOverview>(environment.apiUrl + '/statistics/overview', { params }));
  }
}
