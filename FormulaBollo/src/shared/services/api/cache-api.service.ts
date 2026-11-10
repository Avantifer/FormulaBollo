import { HttpClient, HttpHeaders } from "@angular/common/http";
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

  /** Sube la versión de la caché de los clientes. Solo administradores: necesita el token de sesión. */
  updateCache(): Observable<any> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem("auth")}` });
    return this.httpClient.post(`${environment.apiUrl}${this.endpoint}/update`, {}, { headers });
  }
}