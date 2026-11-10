import { ApplicationConfig, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { ChangeDetectionTickService } from '../shared/services/change-detection.service';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { tickInterceptor } from '../shared/interceptors/tick.interceptor';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { NavigationEnd, PreloadAllModules, Router, provideRouter, withPreloading } from '@angular/router';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';


const palette = {
  primary: { 50: '#FFF1F0', 100: '#FFE0DD', 200: '#FFC2BD', 300: '#FF968E', 400: '#FF5D52', 500: '#F2352E', 600: '#E10600', 700: '#B80500', 800: '#900400', 900: '#6E0300', 950: '#430200' },
  surface: { 0: '#ffffff', 50: '#F6F7F8', 100: '#EEF0F2', 200: '#DEE1E5', 300: '#C3C8CF', 400: '#8E96A1', 500: '#646D79', 600: '#4A525C', 700: '#2F353D', 800: '#1D2127', 900: '#14171B', 950: '#0E1013' }
};

const FormulaBolloPreset = definePreset(Aura, {
  semantic: {
    primary: palette.primary,
    colorScheme: {
      light: { surface: palette.surface },
      dark: { surface: palette.surface }
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    // Los parámetros de ruta se leen en suscripciones que mutan campos: refrescar al terminar cada navegación.
    provideAppInitializer(() => {
      const tick = inject(ChangeDetectionTickService);
      inject(Router).events.subscribe((event) => event instanceof NavigationEnd && tick.schedule());
    }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withFetch(), withInterceptors([tickInterceptor])),
    providePrimeNG({
      theme: {
        preset: FormulaBolloPreset,
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
  ] 
};
