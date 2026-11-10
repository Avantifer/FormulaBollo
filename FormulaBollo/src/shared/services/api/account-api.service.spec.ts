import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccountApiService } from './account-api.service';
import { environment } from '../../../enviroments/enviroment';

describe('AccountApiService', () => {
  it('envía la contraseña por JSON y el token por Authorization, sin parámetros en la URL', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);

    TestBed.inject(AccountApiService).changePassword('secreto & nuevo', 'recovery-token').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/account/changePassword`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ password: 'secreto & nuevo' });
    expect(request.request.params.keys()).toEqual([]);
    expect(request.request.headers.get('Authorization')).toBe('Bearer recovery-token');
    request.flush('ok');
    http.verify();
  });
});
