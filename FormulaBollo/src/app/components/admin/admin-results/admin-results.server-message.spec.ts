import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { NEVER, of } from 'rxjs';
import { driverPointsFixture, provideComponentTesting } from '../../../../testing/component-test-providers';
import { Race } from '../../../../shared/models/race';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
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
  for (let failedStep = 0; failedStep < steps.length; failedStep++) {
    it(`shows the plain-text 422 body from ${steps[failedStep]} and stops the save sequence`, async () => {
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('p-button.saveResults button');
      button.click();
      await settle();
      const serverText = `GP Mensaje: faltan precios para Ana y Bea (${steps[failedStep]})`;
      for (let step = 0; step <= failedStep; step++) {
        const request = http.expectOne(request => request.url.endsWith(steps[step]));
        if (step === failedStep) {
          request.flush(serverText, { status: 422, statusText: 'Unprocessable Entity', headers: { 'Content-Type': 'text/plain' } });
        } else {
          request.flush('Paso guardado');
        }
        await settle();
      }
      expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: serverText }));
      expect(button.disabled).toBeFalse();
      http.expectNone(request => request.method === 'POST' || request.method === 'PUT');
    });
  }
});
