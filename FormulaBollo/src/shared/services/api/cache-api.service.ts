import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from '../../../enviroments/enviroment';

@Injectable({
  providedIn: "root",
})
export class CacheApiService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly endpoint: string = "/cache";

  getCache(): Observable<number> {
    return this.httpClient.get<number>(`${environment.apiUrl}${this.endpoint}/current`);
  }

  updateCache(): Observable<any> {
    return this.httpClient.post(`${environment.apiUrl}${this.endpoint}/update`, {});
  }
}