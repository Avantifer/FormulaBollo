import { PenaltySeverity } from './../../models/penaltySeverity';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { CacheService } from '../cache.service';

@Injectable({
  providedIn: 'root'
})
export class PenaltySeverityApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly cacheService: CacheService = inject(CacheService);

  private readonly endpoint: string = "/penaltiesSeverity";

  getAllPenaltiesSeverity(): Observable<PenaltySeverity[]> {
    const cacheKey: string = `allPenaltySeverity`;

    return this.cacheService.getOrLoad(cacheKey, () => this.httpClient.get<PenaltySeverity[]>(`${environment.apiUrl}${this.endpoint}/all`));
  }
}
