import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MessageService } from 'primeng/api';
import { environment } from '../../../enviroments/enviroment';
import { SelectRacesComponent } from '../../../shared/components/select-races/select-races.component';
import { Race } from '../../../shared/models/race';
import { AuthJWTService } from '../../../shared/services/authJWT.service';
import { CacheService } from '../../../shared/services/cache.service';
import { ImageService } from '../../../shared/services/image.service';
import { routes } from '../../app.routes';

// No import of the future component: these tests keep compiling before the feature exists.
describe('Precios Fantasy through the real admin routes and HTTP backend', () => {
  let harness: RouterTestingHarness | undefined;
  let http: HttpTestingController;
  let messages: jasmine.Spy;
  const race = new Race(71, 'GP Uno', '', '', new Date('2026-05-01'), environment.seasonActual, 0);
  const secondRace = new Race(72, 'GP Dos', '', '', new Date('2026-05-08'), environment.seasonActual, 0);
  const dataset = {
    drivers: [
      { id: 11, name: 'Ana', storedPrice: 6_000_000, suggestedPrice: 5_000_000 },
      { id: 12, name: 'Bea', storedPrice: null, suggestedPrice: 7_000_000 },
      { id: 13, name: 'Carla', storedPrice: null, suggestedPrice: null },
    ],
    teams: [
      { id: 21, name: 'Red', storedPrice: 10_000_000, suggestedPrice: 9_000_000 },
      { id: 22, name: 'Blue', storedPrice: null, suggestedPrice: 8_000_000 },
      { id: 23, name: 'Green', storedPrice: null, suggestedPrice: null },
    ],
  };

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('auth', 'admin-test-session');
    harness = undefined;
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(),
        provideRouter(routes), MessageService,
        { provide: AuthJWTService, useValue: { isLogged: () => true, checkAdmin: () => true } },
        { provide: ImageService, useValue: { getImageUrl: () => 'assets/test.png' } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    messages = spyOn(TestBed.inject(MessageService), 'add').and.callThrough();
    TestBed.inject(CacheService).updateVersion(41);
  });

  afterEach(() => {
    // Destroy before verifying so cancelled requests from a race switch are accounted for.
    harness?.fixture.destroy();
    http.verify({ ignoreCancelled: true });
    TestBed.inject(CacheService).clearCache();
    localStorage.clear();
  });

  async function settle(): Promise<void> {
    for (let turn = 0; turn < 8; turn++) await Promise.resolve();
    harness!.detectChanges();
    await harness!.fixture.whenStable();
    harness!.detectChanges();
  }

  async function open(flushPrices = true): Promise<TestRequest> {
    // Resolve the actual route, never install a test-only replacement for the missing screen.
    harness = await RouterTestingHarness.create('/admin/prices');
    await settle();
    if (TestBed.inject(Router).routerState.snapshot.root.firstChild?.routeConfig?.path !== 'admin') {
      throw new Error('The real route table must resolve /admin/prices inside the admin panel');
    }
    const calendar = http.expectOne(request => request.method === 'GET' && request.url.endsWith('/races/all'));
    expect(calendar.request.params.get('season')).toBe(String(environment.seasonActual.number));
    calendar.flush([race, secondRace]);
    await settle();
    const prices = http.expectOne(request => request.method === 'GET' && request.url.endsWith('/fantasy/adminPrices'));
    expect(prices.request.params.get('raceId')).toBe(String(race.id));
    expect(prices.request.headers.get('Authorization')).toBe('Bearer admin-test-session');
    if (flushPrices) {
      prices.flush(dataset);
      await settle();
    }
    return prices;
  }

  function inputs(): HTMLInputElement[] {
    return Array.from(harness!.routeNativeElement!.querySelectorAll<HTMLInputElement>(
      'input[type="number"], input[role="spinbutton"], input[inputmode="decimal"], input[inputmode="numeric"]'));
  }

  function row(name: string): HTMLElement {
    for (const input of inputs()) {
      let parent = input.parentElement;
      while (parent && parent !== harness!.routeNativeElement) {
        if (parent.textContent?.includes(name) && parent.querySelectorAll('input').length === 1) return parent;
        parent = parent.parentElement;
      }
    }
    throw new Error(`No editable price row found for ${name}`);
  }

  function priceInput(name: string): HTMLInputElement { return row(name).querySelector('input')!; }

  function moneyValue(name: string): number {
    const value = priceInput(name).value.replace(/[^0-9.,-]/g, '');
    const cents = /[.,]([0-9]{1,2})$/.exec(value);
    return cents
      ? Number(value.slice(0, cents.index).replace(/[.,]/g, '') + '.' + cents[1])
      : Number(value.replace(/[.,]/g, ''));
  }

  async function type(name: string, value: string): Promise<void> {
    const input = priceInput(name);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await settle();
  }

  function saveButton(): HTMLButtonElement {
    const button = Array.from(harness!.routeNativeElement!.querySelectorAll('button'))
      .find(element => element.textContent?.includes('Guardar precios'));
    if (!button) throw new Error('Missing Guardar precios button');
    return button;
  }

  function put(): TestRequest {
    const request = http.expectOne(request => request.method === 'PUT' && request.url.endsWith('/fantasy/adminPrices'));
    expect(request.request.params.get('raceId')).toBe(String(race.id));
    expect(request.request.headers.get('Authorization')).toBe('Bearer admin-test-session');
    return request;
  }

  async function switchRace(): Promise<void> {
    const selector = harness!.fixture.debugElement.query(By.directive(SelectRacesComponent));
    if (!selector) throw new Error('Expected the shared admin race selector');
    const component = selector.componentInstance as SelectRacesComponent;
    component.racesForm.get('race')!.setValue(secondRace);
    await settle();
  }

  it('registers the prices child route behind the existing admin guard', () => {
    const admin = routes.find(route => route.path === 'admin');
    expect(admin?.canActivate?.length).toBeGreaterThan(0);
    expect(admin?.children?.find(route => route.path === 'prices')).toBeDefined();
  });

  it('renders a Precios Fantasy menu link pointing to the real prices route', async () => {
    // The existing admin page can be tested even while the prices child is absent.
    harness = await RouterTestingHarness.create('/admin/penalties');
    await settle();
    http.match(() => true).forEach(request => request.flush([]));
    await settle();
    const link = Array.from(harness.routeNativeElement!.querySelectorAll('a'))
      .find(element => element.textContent?.includes('Precios Fantasy'));
    expect(link).withContext('admin menu entry').toBeDefined();
    expect(link?.getAttribute('href')).toBe('/admin/prices');
  });

  it('loads current-season races and every driver/team, preferring stored money-unit prices', async () => {
    await open();
    expect(inputs().length).toBe(6);
    expect(moneyValue('Ana')).toBe(6_000_000);
    expect(moneyValue('Bea')).toBe(7_000_000);
    expect(moneyValue('Red')).toBe(10_000_000);
    expect(moneyValue('Blue')).toBe(8_000_000);
    expect(priceInput('Carla').value).toBe('');
    expect(priceInput('Green').value).toBe('');
  });

  it('visibly marks unsaved suggestions and required rows and displays readable money', async () => {
    await open();
    expect(row('Bea').textContent).toMatch(/suger|sin guardar|no guardad/i);
    expect(row('Blue').textContent).toMatch(/suger|sin guardar|no guardad/i);
    expect(row('Carla').textContent).toMatch(/obligatori|requerid|sin precio/i);
    expect(row('Green').textContent).toMatch(/obligatori|requerid|sin precio/i);
    expect(row('Ana').textContent + priceInput('Ana').value).toMatch(/6[.\s\u00a0]000[.\s\u00a0]000|6[,.]0+\s*M|6\s*(M|mill)/);
  });

  it('sends populated valid rows in money units and omits untouched empty rows', async () => {
    await open();
    await type('Ana', '12000000');
    saveButton().click();
    await settle();
    const save = put();
    expect(save.request.body.drivers).toEqual(jasmine.arrayWithExactContents([
      { id: 11, price: 12_000_000 }, { id: 12, price: 7_000_000 },
    ]));
    expect(save.request.body.teams).toEqual(jasmine.arrayWithExactContents([
      { id: 21, price: 10_000_000 }, { id: 22, price: 8_000_000 },
    ]));
    save.flush('Precios guardados para GP Uno');
    await settle();
    expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: 'Precios guardados para GP Uno' }));
  });

  for (const [name, value] of [
    ['Ana', '999999'], ['Ana', '30000001'], ['Ana', ''],
    ['Red', '999999'], ['Red', '30000001'], ['Red', ''], ['Carla', ''], ['Green', ''],
  ]) {
    it(`blocks submission and marks the touched invalid price ${name}=${JSON.stringify(value)}`, async () => {
      await open();
      await type(name, value);
      saveButton().click();
      await settle();
      http.expectNone(request => request.method === 'PUT');
      const input = priceInput(name);
      const invalid = input.getAttribute('aria-invalid') === 'true' || input.matches(':invalid')
        || /inválid|invalid|obligatori|requerid|1[. ]000[. ]000|30[. ]000[. ]000/.test(row(name).textContent ?? '');
      expect(invalid).withContext('visible invalid/required indication on the edited row').toBeTrue();
    });
  }

  it('accepts the inclusive minimum and maximum price limits', async () => {
    await open();
    await type('Ana', '1000000');
    await type('Red', '30000000');
    saveButton().click();
    await settle();
    const save = put();
    expect(save.request.body.drivers).toContain({ id: 11, price: 1_000_000 });
    expect(save.request.body.teams).toContain({ id: 21, price: 30_000_000 });
    save.flush('Guardado');
    await settle();
  });

  it('shows the server error, preserves typed prices and allows retry after failure', async () => {
    await open();
    await type('Ana', '12345678');
    saveButton().click();
    await settle();
    put().flush('GP Uno: falta el precio de Carla', { status: 422, statusText: 'Unprocessable Entity' });
    await settle();
    expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'GP Uno: falta el precio de Carla' }));
    expect(moneyValue('Ana')).toBe(12_345_678);
    expect(saveButton().disabled).toBeFalse();
    saveButton().click();
    await settle();
    const retry = put();
    expect(retry.request.body.drivers).toContain({ id: 11, price: 12_345_678 });
    retry.flush('Reintento guardado');
    await settle();
  });

  it('prevents double submit while the HTTP write is pending', async () => {
    await open();
    const button = saveButton();
    button.click();
    button.click();
    await settle();
    expect(saveButton().disabled).toBeTrue();
    put().flush('Guardado');
    await settle();
    expect(saveButton().disabled).toBeFalse();
  });

  it('ignores a stale price load after switching races', async () => {
    const firstLoad = await open(false);
    await switchRace();
    const currentLoad = http.expectOne(request => request.url.endsWith('/fantasy/adminPrices')
      && request.params.get('raceId') === String(secondRace.id));
    currentLoad.flush({ drivers: [{ id: 14, name: 'Diana', storedPrice: 9_000_000, suggestedPrice: 9_000_000 }], teams: [] });
    await settle();
    // Cancellation is also a valid way of ignoring the old response.
    if (!firstLoad.cancelled) firstLoad.flush(dataset);
    await settle();
    expect(harness!.routeNativeElement!.textContent).toContain('Diana');
    expect(harness!.routeNativeElement!.textContent).not.toContain('Ana');
    expect(inputs().length).toBe(1);
  });

  for (const failure of [false, true]) {
    it(`ignores a stale save ${failure ? 'failure' : 'success'} after switching races`, async () => {
      await open();
      saveButton().click();
      await settle();
      const pendingSave = put();
      await switchRace();
      http.expectOne(request => request.url.endsWith('/fantasy/adminPrices')
        && request.params.get('raceId') === String(secondRace.id)).flush(dataset);
      await settle();
      await type('Ana', '19000000');
      messages.calls.reset();
      if (!pendingSave.cancelled) {
        if (failure) pendingSave.flush('Old race failed', { status: 422, statusText: 'Unprocessable Entity' });
        else pendingSave.flush('Old race saved');
      }
      await settle();
      expect(messages).not.toHaveBeenCalled();
      expect(moneyValue('Ana')).toBe(19_000_000);
      expect(TestBed.inject(Router).url).toBe('/admin/prices');
    });
  }

  it('keeps the form and draft prices without reloading on data publication', async () => {
    await open();
    await type('Ana', '17000000');
    const originalInput = priceInput('Ana');
    TestBed.inject(CacheService).updateVersion(42);
    await settle();
    http.expectNone(request => request.method === 'GET');
    expect(priceInput('Ana')).toBe(originalInput);
    expect(moneyValue('Ana')).toBe(17_000_000);
  });
});
