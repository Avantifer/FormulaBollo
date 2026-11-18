import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '../shared/services/auth.interceptor';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import type { ComponentsDesignTokens } from '@primeuix/themes/types';
import { provideRouter, withPreloading } from '@angular/router';
import { SelectivePreloadStrategy } from '../shared/services/selective-preload.strategy';


const palette = {
  primary: { 50: '#FFF1F0', 100: '#FFE0DD', 200: '#FFC2BD', 300: '#FF968E', 400: '#FF5D52', 500: '#F2352E', 600: '#E10600', 700: '#B80500', 800: '#900400', 900: '#6E0300', 950: '#430200' },
  surface: { 0: '#ffffff', 50: '#F6F7F8', 100: '#EEF0F2', 200: '#DEE1E5', 300: '#C3C8CF', 400: '#8E96A1', 500: '#646D79', 600: '#4A525C', 700: '#2F353D', 800: '#1D2127', 900: '#14171B', 950: '#0E1013' }
};

const inputFieldTokens = {
  background: 'var(--panel)',
  borderColor: 'var(--rule)',
  hoverBorderColor: 'var(--ink-soft)',
  focusBorderColor: 'var(--fantasy)',
  color: 'var(--ink)',
  placeholderColor: 'var(--ink-soft)',
  shadow: 'none'
};

const toggleButtonColors = {
  root: {
    background: 'var(--panel-alt)',
    borderColor: 'var(--rule)',
    color: 'var(--ink-soft)',
    hoverBackground: 'var(--panel)',
    hoverColor: 'var(--ink)',
    checkedBackground: 'var(--pit)',
    checkedColor: 'var(--on-pit)',
    checkedBorderColor: 'var(--pit)'
  },
  content: { checkedBackground: 'transparent' },
  icon: { color: 'inherit', hoverColor: 'inherit', checkedColor: 'inherit' }
} satisfies ComponentsDesignTokens['togglebutton'];

const toastColors = {
  root: { blur: '0' },
  success: { background: 'var(--panel)', color: 'var(--ink)', borderColor: 'var(--sector-up)', detailColor: 'var(--ink-soft)', shadow: 'none' },
  error: { background: 'var(--panel)', color: 'var(--ink)', borderColor: 'var(--sector-down)', detailColor: 'var(--ink-soft)', shadow: 'none' },
  warn: { background: 'var(--panel)', color: 'var(--ink)', borderColor: 'var(--warn)', detailColor: 'var(--ink-soft)', shadow: 'none' },
  info: { background: 'var(--panel)', color: 'var(--ink)', borderColor: 'var(--fantasy-text)', detailColor: 'var(--ink-soft)', shadow: 'none' }
} satisfies ComponentsDesignTokens['toast'];

export const FormulaBolloPreset = definePreset(Aura, {
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
  },
  components: {
    select: {
      root: {
        background: 'var(--panel)',
        borderColor: 'var(--rule)',
        hoverBorderColor: 'var(--ink-soft)',
        focusBorderColor: 'var(--focus)',
        color: 'var(--ink)',
        placeholderColor: 'var(--ink-soft)',
        shadow: 'none',
        borderRadius: '0.25rem'
      },
      dropdown: { color: 'var(--ink-soft)' },
      overlay: { background: 'var(--panel)', borderColor: 'var(--rule)', color: 'var(--ink)', borderRadius: '0.5rem', shadow: 'none' },
      option: {
        color: 'var(--ink)',
        focusColor: 'var(--ink)',
        focusBackground: 'var(--panel-alt)',
        selectedBackground: 'transparent',
        selectedColor: 'var(--ink)',
        selectedFocusBackground: 'var(--panel-alt)',
        selectedFocusColor: 'var(--ink)'
      }
    },
    inputtext: { root: inputFieldTokens },
    textarea: { root: inputFieldTokens },
    togglebutton: {
      root: { borderRadius: '0.25rem' },
      content: { borderRadius: '0.25rem', checkedShadow: 'none' },
      // Aura defines these colors per scheme, so override both with the same CSS tokens.
      colorScheme: { light: toggleButtonColors, dark: toggleButtonColors }
    },
    dialog: {
      root: { background: 'var(--panel)', borderColor: 'var(--rule)', color: 'var(--ink)', borderRadius: '0.5rem', shadow: '0 8px 24px rgb(0 0 0 / 0.12)' }
    },
    divider: { root: { borderColor: 'var(--rule)' } },
    toast: { colorScheme: { light: toastColors, dark: toastColors } },
    card: { root: { background: 'var(--panel)', color: 'var(--ink)', borderRadius: '0.5rem', shadow: 'none' } }
  } satisfies ComponentsDesignTokens
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
