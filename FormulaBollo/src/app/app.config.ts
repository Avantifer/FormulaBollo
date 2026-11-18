import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '../shared/services/auth.interceptor';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { provideRouter, withPreloading } from '@angular/router';
import { SelectivePreloadStrategy } from '../shared/services/selective-preload.strategy';


const palette = {
  primary: { 50: '#FFF1F0', 100: '#FFE0DD', 200: '#FFC2BD', 300: '#FF968E', 400: '#FF5D52', 500: '#F2352E', 600: '#E10600', 700: '#B80500', 800: '#900400', 900: '#6E0300', 950: '#430200' },
  surface: { 0: '#ffffff', 50: '#F6F7F8', 100: '#EEF0F2', 200: '#DEE1E5', 300: '#C3C8CF', 400: '#8E96A1', 500: '#646D79', 600: '#4A525C', 700: '#2F353D', 800: '#1D2127', 900: '#14171B', 950: '#0E1013' }
};

const FormulaBolloPreset = definePreset(Aura, {
  semantic: {
    primary: palette.primary,
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.600}',
      offset: '2px'
    },
    formField: { borderRadius: '0.25rem' },
    content: { borderRadius: '0.5rem' },
    colorScheme: {
      light: { surface: palette.surface },
      dark: {
        surface: palette.surface,
        focusRing: { color: '{primary.400}' }
      }
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withPreloading(SelectivePreloadStrategy)),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    providePrimeNG({
      translation: {
        aria: {
          trueLabel: 'Verdadero',
          falseLabel: 'Falso',
          nullLabel: 'Sin seleccionar',
          star: '1 estrella',
          stars: '{star} estrellas',
          selectAll: 'Seleccionar todo',
          unselectAll: 'Desmarcar todo',
          navigation: 'Navegación',
          previous: 'Anterior',
          next: 'Siguiente',
          scrollTop: 'Volver arriba',
          moveTop: 'Mover al principio',
          moveUp: 'Subir',
          moveDown: 'Bajar',
          moveBottom: 'Mover al final',
          moveToTarget: 'Mover al destino',
          moveToSource: 'Mover al origen',
          moveAllToTarget: 'Mover todo al destino',
          moveAllToSource: 'Mover todo al origen',
          pageLabel: 'Página {page}',
          firstPageLabel: 'Primera página',
          lastPageLabel: 'Última página',
          nextPageLabel: 'Página siguiente',
          prevPageLabel: 'Página anterior',
          rowsPerPageLabel: 'Filas por página',
          previousPageLabel: 'Página anterior',
          jumpToPageDropdownLabel: 'Ir a la página',
          jumpToPageInputLabel: 'Ir a la página',
          selectRow: 'Seleccionar fila',
          unselectRow: 'Desmarcar fila',
          expandRow: 'Expandir fila',
          collapseRow: 'Contraer fila',
          showFilterMenu: 'Mostrar filtros',
          hideFilterMenu: 'Ocultar filtros',
          filterOperator: 'Operador de filtro',
          filterConstraint: 'Condición de filtro',
          editRow: 'Editar fila',
          saveEdit: 'Guardar cambios',
          cancelEdit: 'Cancelar edición',
          listView: 'Vista de lista',
          gridView: 'Vista de cuadrícula',
          slide: 'Diapositiva',
          slideNumber: '{slideNumber}',
          zoomImage: 'Ampliar imagen',
          zoomIn: 'Acercar',
          zoomOut: 'Alejar',
          rotateRight: 'Girar a la derecha',
          rotateLeft: 'Girar a la izquierda',
          listLabel: 'Lista de opciones',
          selectColor: 'Seleccionar color',
          removeLabel: 'Eliminar',
          browseFiles: 'Explorar archivos',
          maximizeLabel: 'Maximizar',
          minimizeLabel: 'Minimizar',
          close: 'Cerrar'
        }
      },
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
    MessageService,
  ] 
};
