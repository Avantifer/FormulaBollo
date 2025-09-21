import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import Aura from '@primeng/themes/aura';
import { provideRouter } from '@angular/router';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { AdminGuard } from '../shared/guards/AdminGuard';
import { LoginGuard } from '../shared/guards/LoginGuard';
import { RecoverPasswordGuard } from '../shared/guards/RecoverPasswordGuard';
import { FantasyTeamGuard } from '../shared/guards/FantasyTeamGuard';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-utilities, tailwind, primeng'
          }
        }
      }
    }),
    { provide: JWT_OPTIONS, useValue: JWT_OPTIONS },
    JwtHelperService,
    MessageService,
    AdminGuard,
    LoginGuard,
    RecoverPasswordGuard,
    FantasyTeamGuard
  ] 
};
