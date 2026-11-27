import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthJWTService } from './authJWT.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthJWTService);
  const router = inject(Router);
  const credentialsRequest = /\/account\/(login|register)(?:[/?]|$)/.test(request.url);
  const authorization = request.headers.get('Authorization');
  const sessionToken = localStorage.getItem('auth');
  // A parallel response may clear this session before this request fails.
  const sessionRequest = sessionToken !== null && authorization === `Bearer ${sessionToken}`;
  return next(request).pipe(catchError((error: unknown) => {
    const currentToken = localStorage.getItem('auth');
    if (error instanceof HttpErrorResponse && error.status === 401
        && (authorization === `Bearer ${currentToken}` || (currentToken === null && sessionRequest))
        && !credentialsRequest) {
      auth.clearSession();
      void router.navigate(['/fantasy/login']);
    }
    return throwError(() => error);
  }));
};
