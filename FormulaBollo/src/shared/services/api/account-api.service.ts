import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { Account } from '../../models/account';
import { BaseApiService } from '../baseApiService.service';

@Injectable({
  providedIn: 'root'
})
export class AccountApiService {
  private readonly endpoint: string = "/account";
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly baseApiService: BaseApiService = inject(BaseApiService);

  login(account: Account): Observable<string> {
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      Accept: "text/plain",
    });

    return this.httpClient.post<string>(`${environment.apiUrl}${this.endpoint}/login`, account, { headers, responseType: "text" as "json" });
  }

  register(account: Account): Observable<string> {
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      Accept: "text/plain",
    });

    return this.httpClient.post<string>(`${environment.apiUrl}${this.endpoint}/register`, account, { headers, responseType: "text" as "json" });
  }

  changePassword(username: string, password: string): Observable<string> {
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      Accept: "text/plain",
    });

    const params = this.baseApiService.createParams({ username: username, password: password });

    return this.httpClient.post<string>(`${environment.apiUrl}${this.endpoint}/changePassword`, null, { params, headers, responseType: "text" as "json" });
  }

  recoverPassword(email: string): Observable<string> {
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      Accept: "text/plain",
    });

    const params = this.baseApiService.createParams({ email: email });

    return this.httpClient.post<string>(`${environment.apiUrl}${this.endpoint}/recoverPassword`, null, { params, headers, responseType: "text" as "json" });
  }

  getUserById(id: number): Observable<string> {
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      Accept: "text/plain",
    });

    const params = this.baseApiService.createParams({ id: id });

    return this.httpClient.get<string>(`${environment.apiUrl}${this.endpoint}/id`, { params, headers, responseType: "text" as "json" });
  }

}
