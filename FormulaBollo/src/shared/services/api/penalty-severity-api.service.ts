import { PenaltySeverity } from './../../models/penaltySeverity';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
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
    const cache = this.cacheService.getCache();

    if (cache.has(cacheKey)) return of(cache.get(cacheKey) as PenaltySeverity[]);

    return this.httpClient.get<PenaltySeverity[]>(`${environment.apiUrl}${this.endpoint}/all`).pipe(
      tap(data => {
        cache.set(cacheKey, data);
        this.cacheService.saveCache();
      })
    );
  }
}
