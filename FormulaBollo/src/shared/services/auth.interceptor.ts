import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthJWTService } from './authJWT.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthJWTService);
  const router = inject(Router);
  const credentialsRequest = /\/account\/(login|register)(?:[/?]|$)/.test(request.url);
  return next(request).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401
        && request.headers.has('Authorization') && !credentialsRequest) {
      auth.clearSession();
      void router.navigate(['/fantasy/login']);
    }
    return throwError(() => error);
  }));
};
