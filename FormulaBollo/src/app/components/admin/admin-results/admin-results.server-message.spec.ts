import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { NEVER, of } from 'rxjs';
import { driverPointsFixture, provideComponentTesting } from '../../../../testing/component-test-providers';
import { Race } from '../../../../shared/models/race';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
import { CacheService } from '../../../../shared/services/cache.service';
import { environment } from '../../../../enviroments/enviroment';
import { AdminResultsComponent } from './admin-results.component';

describe('Admin results server validation messages over HTTP', () => {
  let fixture: ComponentFixture<AdminResultsComponent>;
  let http: HttpTestingController;
  let messages: jasmine.Spy;
  const driver = driverPointsFixture.driver;
  const race = new Race(81, 'GP Mensaje', '', '', '2026-05-01T12:00:00' as unknown as Date, driver.season, 0);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminResultsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: DriverApiService, useValue: { getAllDrivers: () => of([driver]) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(RaceApiService), 'getAllRaces').and.returnValue(NEVER);
    messages = spyOn(TestBed.inject(MessageService), 'add').and.callThrough();
    spyOn(console, 'error');
    spyOn(console, 'log');
    fixture = TestBed.createComponent(AdminResultsComponent);
    fixture.detectChanges();
    await settle();
    fixture.componentInstance.onRaceChange(race);
    http.expectOne(request => request.url.endsWith('/results/raceByPilots')).flush([]);
    fixture.componentInstance.onDriverChangeResult(driver, 0);
    fixture.componentInstance.onDriverChangeFastLap(driver);
    fixture.componentInstance.onDriverChangePole(driver);
    await settle();
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
  });

  async function settle(): Promise<void> {
    for (let turn = 0; turn < 8; turn++) await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const steps = ['/results/save', '/races/save', '/fantasy/saveDriverTeamPoints', '/fantasy/saveDriverTeamPrices'];

  it('sends the complete snapshot once, clears the API cache and shows exactly one success toast', async () => {
    const component = fixture.componentInstance;
    const cache = TestBed.inject(CacheService);
    cache.getCache().set('stale-results', ['old']);
    localStorage.setItem('auth', 'admin-session');
    component.raceDate = new Date(2026, 5, 2, 14, 30, 17);
    component.saveResults();
    component.saveResults();
    const pending = http.expectOne(`${environment.apiUrl}/races/close`);
    expect(pending.request.method).toBe('PUT');
    expect(pending.request.responseType).toBe('text');
    expect(pending.request.headers.get('Authorization')).toBe('Bearer admin-session');
    expect(pending.request.headers.get('Content-Type')).toBe('application/json');
    expect(pending.request.headers.get('Accept')).toBe('text/plain');
    const body = JSON.parse(String(pending.request.serializeBody()));
    const submittedRace = { ...race, dateStart: '2026-06-02T14:30:17' };
    expect(body).toEqual(JSON.parse(JSON.stringify({
      race: { ...submittedRace, finished: 1 },
      results: [{ race: submittedRace, driver, position: { id: 1, positionNumber: 1, points: 0 }, fastlap: 1, pole: 1 }],
    })));
    expect(cache.getCache().has('stale-results')).toBeFalse();
    expect(component.isSaving()).toBeTrue();
    expect(messages).not.toHaveBeenCalled();
    http.expectNone(request => request.method === 'POST' || request.method === 'PUT');
    pending.flush('Carrera cerrada con puntos y precios');
    await settle();
    expect(messages).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      severity: 'success', detail: 'Carrera cerrada con puntos y precios',
    }));
    expect(component.isSaving()).toBeFalse();
    expect(race.finished).toBe(0);
    expect(race.dateStart as unknown).toBe('2026-05-01T12:00:00');
    http.expectNone(request => request.method === 'POST' || request.method === 'PUT');
  });

  it('leaving the screen leaves only the complete atomic close request and never starts legacy writes', () => {
    fixture.componentInstance.saveResults();
    const pending = http.expectOne(request => request.method === 'PUT' && request.url.endsWith('/races/close'));
    const body = JSON.parse(String(pending.request.serializeBody()));
    expect(body.race.id).toBe(81);
    expect(body.results).toHaveSize(1);
    expect(body.results[0]).toEqual(jasmine.objectContaining({ race: jasmine.objectContaining({ id: 81 }), driver: JSON.parse(JSON.stringify(driver)), fastlap: 1, pole: 1 }));
    fixture.destroy();
    // Whether the browser detaches or awaits the response, every write is already in this request.
    if (!pending.cancelled) pending.flush('Carrera cerrada');
    http.expectNone(request => request.method === 'POST' || request.method === 'PUT');
  });

  it('can retry the same edited form after a failed atomic close', async () => {
    const component = fixture.componentInstance;
    component.raceDate = new Date(2026, 5, 2, 14, 30, 17);
    component.saveResults();
    const failed = http.expectOne(request => request.url.endsWith('/races/close'));
    const snapshot = failed.request.serializeBody();
    failed.flush('Otro cierre simultáneo', { status: 409, statusText: 'Conflict' });
    await settle();
    expect(messages).toHaveBeenCalledOnceWith(jasmine.objectContaining({ severity: 'error', detail: 'Otro cierre simultáneo' }));
    expect(component.raceDate).toEqual(new Date(2026, 5, 2, 14, 30, 17));
    component.saveResults();
    const retried = http.expectOne(request => request.url.endsWith('/races/close'));
    expect(retried.request.serializeBody()).toEqual(snapshot);
    retried.flush('Cierre completado');
    await settle();
    expect(messages.calls.allArgs().filter(([message]) => message.severity === 'success')).toEqual([
      [jasmine.objectContaining({ detail: 'Cierre completado' })],
    ]);
    http.expectNone(request => request.method === 'POST' || request.method === 'PUT');
  });

  for (let failedStep = 0; failedStep < steps.length; failedStep++) {
    it(`shows the plain-text 422 body when close fails at ${steps[failedStep]} and keeps the form`, async () => {
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('p-button.saveResults button');
      button.click();
      await settle();
      const serverText = `GP Mensaje: faltan precios para Ana y Bea (${steps[failedStep]})`;
      const request = http.expectOne(request => request.method === 'PUT' && request.url.endsWith('/races/close'));
      request.flush(serverText, { status: 422, statusText: 'Unprocessable Entity', headers: { 'Content-Type': 'text/plain' } });
      await settle();
      expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: serverText }));
      expect(button.disabled).toBeFalse();
      expect(messages.calls.allArgs().filter(([message]) => message.severity === 'success')).toEqual([]);
      expect(fixture.componentInstance.raceSelected?.id).toBe(81);
      expect(fixture.componentInstance.raceDate).toEqual(new Date(race.dateStart));
      expect(fixture.componentInstance.driversSelected[0]).toEqual(driver);
      expect(fixture.componentInstance.fastlapDriver()).toEqual(driver);
      expect(fixture.componentInstance.poleDriver()).toEqual(driver);
      http.expectNone(request => request.method === 'POST' || request.method === 'PUT');
    });
  }
});
