import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { tickInterceptor } from './tick.interceptor';

@Component({ selector: 'app-probe', template: '{{ value }}' })
class ProbeComponent {
  value = 'vacio';
  constructor() {
    inject(HttpClient).get<string>('/probe').subscribe((v) => (this.value = v));
  }
}

@Component({ selector: 'app-child', template: '{{ value }}' })
class ChildComponent {
  value = 'hijo-vacio';
  constructor() {
    inject(HttpClient).get<string>('/child').subscribe((v) => (this.value = v));
  }
}

@Component({ selector: 'app-parent', imports: [ChildComponent], template: '<app-child />' })
class ParentComponent {}

const wait = () => new Promise((resolve) => setTimeout(resolve, 20));

/** Arranca el componente como raíz real de la aplicación, igual que AppComponent. */
async function render(interceptors: (typeof tickInterceptor)[]): Promise<string> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors(interceptors)),
      provideHttpClientTesting(),
    ],
  });
  const host = document.createElement('app-probe');
  document.body.appendChild(host);
  const appRef = TestBed.inject(ApplicationRef);
  appRef.bootstrap(ProbeComponent, host);
  await appRef.whenStable();

  TestBed.inject(HttpTestingController).expectOne('/probe').flush('cargado');
  await wait();

  const text = host.textContent ?? '';
  host.remove();
  return text;
}

async function renderNested(): Promise<string> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([tickInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const host = document.createElement('app-parent');
  document.body.appendChild(host);
  const appRef = TestBed.inject(ApplicationRef);
  appRef.bootstrap(ParentComponent, host);
  await appRef.whenStable();

  TestBed.inject(HttpTestingController).expectOne('/child').flush('hijo-cargado');
  await wait();

  const text = host.textContent ?? '';
  host.remove();
  return text;
}

describe('tickInterceptor (sin zone.js)', () => {
  it('refresca campos normales tras una respuesta HTTP', async () => {
    expect(await render([tickInterceptor])).toContain('cargado');
  });

  it('sin el interceptor la vista no se actualizaría (justifica su existencia)', async () => {
    expect(await render([])).toContain('vacio');
  });

  it('refresca también componentes hijos anidados', async () => {
    expect(await renderNested()).toContain('hijo-cargado');
  });
});
