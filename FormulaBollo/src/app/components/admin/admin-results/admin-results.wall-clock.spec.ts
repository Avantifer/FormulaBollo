import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DatePicker } from 'primeng/datepicker';
import { NEVER, of } from 'rxjs';
import { driverPointsFixture, provideComponentTesting } from '../../../../testing/component-test-providers';
import { Race } from '../../../../shared/models/race';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { AdminResultsComponent } from './admin-results.component';

describe('Admin results Madrid wall-clock HTTP contract', () => {
  let fixture: ComponentFixture<AdminResultsComponent>;
  let http: HttpTestingController;
  const driver = driverPointsFixture.driver;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminResultsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: DriverApiService, useValue: { getAllDrivers: () => of([driver]) } },
      ],
    }).compileComponents();
    // Selection is explicit; all save services and JSON serialization remain real.
    spyOn(TestBed.inject(RaceApiService), 'getAllRaces').and.returnValue(NEVER);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminResultsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
  });

  for (const sprint of [false, true]) {
    for (const start of ['2025-10-05T21:00:00', '2025-01-05T21:00:00', '2025-10-05T00:30:00', '2025-03-09T02:30:00', '2025-03-30T02:30:00', '2025-10-26T02:30:00']) {
      it(`keeps ${start} zoneless after loading and saving ${sprint ? 'sprint' : 'results'} twice`, async () => {
        const component = fixture.componentInstance;
        component.isSprint = sprint;
        const race = {
          id: 11, name: 'GP', flagImage: '', circuitImage: '',
          dateStart: start, season: driver.season, finished: 0,
        } as unknown as Race; // HttpClient returns strings despite the current Date annotation.
        let loadedRace = race;

        for (let cycle = 1; cycle <= 2; cycle++) {
          component.onRaceChange(loadedRace);
          http.expectOne(request => request.method === 'GET' && request.params.get('raceId') === '11')
            .flush([{ race: loadedRace, driver, position: { id: 1, positionNumber: 1, points: 25 }, fastlap: 1, pole: 1 }]);
          fixture.changeDetectorRef.markForCheck();
          fixture.detectChanges();
          await fixture.whenStable();
          fixture.detectChanges();
          const picker = fixture.debugElement.query(By.directive(DatePicker));
          expect(picker).withContext(`PrimeNG picker cycle ${cycle}`).not.toBeNull();
          expect(fixture.nativeElement.querySelector('input[type="datetime-local"]')).toBeNull();
          component.saveResults();
          const rowsRequest = http.expectOne(request => request.method === 'PUT'
            && request.url.endsWith(sprint ? '/sprints/save' : '/results/save'));
          const rows = JSON.parse(String(rowsRequest.request.serializeBody()));
          expect(rows[0].race.dateStart).withContext(`rows wire JSON cycle ${cycle}`).toBe(start);
          rowsRequest.flush('Saved');
          let wireRace = rows[0].race;
          if (!sprint) {
            const raceRequest = http.expectOne(request => request.url.endsWith('/races/save'));
            wireRace = JSON.parse(String(raceRequest.request.serializeBody()));
            expect(wireRace.dateStart).withContext(`race wire JSON cycle ${cycle}`).toBe(start);
            raceRequest.flush('Saved');
            http.expectOne(request => request.url.endsWith('/saveDriverTeamPoints')).flush('Saved');
            http.expectOne(request => request.url.endsWith('/saveDriverTeamPrices')).flush('Saved');
          }
          // Model today's server dropping the suffix, then reloading its zoneless response.
          // Keep assertions above independent: accepting Z must not make this test pass.
          loadedRace = { ...wireRace, dateStart: wireRace.dateStart.replace(/Z$/, '') } as Race;
          expect(loadedRace.dateStart as unknown).withContext(`reloaded cycle ${cycle}`).toBe(start);
        }
        expect(race.dateStart as unknown).toBe(start);
      });
    }

    it(`serializes picker edits, resets on race switch and blocks an empty ${sprint ? 'sprint' : 'results'} date`, async () => {
      const component = fixture.componentInstance;
      component.isSprint = sprint;
      const warn = spyOn(TestBed.inject(MessageInfoService), 'showWarn');
      const race: Race = {
        id: 11, name: 'GP', flagImage: '', circuitImage: '',
        dateStart: '2025-01-05T21:00:00', season: driver.season, finished: 0,
      };
      async function load(selected: Race): Promise<void> {
        component.onRaceChange(selected);
        http.expectOne(request => request.method === 'GET' && request.params.get('raceId') === String(selected.id))
          .flush([{ race: selected, driver, position: { id: 1, positionNumber: 1, points: 25 }, fastlap: 1, pole: 1 }]);
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
      }
      function edit(date: Date | null): void {
        fixture.debugElement.query(By.directive(DatePicker)).triggerEventHandler('ngModelChange', date);
      }
      function save(expected: string, raceId: number): void {
        component.saveResults();
        const rowsRequest = http.expectOne(request => request.method === 'PUT'
          && request.url.endsWith(sprint ? '/sprints/save' : '/results/save'));
        const rows = JSON.parse(String(rowsRequest.request.serializeBody()));
        expect(rows[0].race.dateStart).toBe(expected);
        expect(rows[0].race.id).toBe(raceId);
        rowsRequest.flush('Saved');
        if (!sprint) {
          const raceRequest = http.expectOne(request => request.url.endsWith('/races/save'));
          const wireRace = JSON.parse(String(raceRequest.request.serializeBody()));
          expect(wireRace.dateStart).toBe(expected);
          expect(wireRace.id).toBe(raceId);
          raceRequest.flush('Saved');
          http.expectOne(request => request.url.endsWith('/saveDriverTeamPoints')).flush('Saved');
          http.expectOne(request => request.url.endsWith('/saveDriverTeamPrices')).flush('Saved');
        }
      }

      await load(race);
      edit(new Date(2025, 5, 2, 14, 30, 17));
      save('2025-06-02T14:30:17', 11);
      save('2025-06-02T14:30:17', 11);
      const otherRace = { ...race, id: 22, dateStart: '2025-03-09T02:30:00' };
      await load(otherRace);
      save(otherRace.dateStart, 22);
      edit(new Date(2025, 6, 3, 15, 45, 23));
      save('2025-07-03T15:45:23', 22);
      expect(race.dateStart).toBe('2025-01-05T21:00:00');
      expect(otherRace.dateStart).toBe('2025-03-09T02:30:00');
      edit(null);
      component.saveResults();
      expect(warn).toHaveBeenCalledWith('Necesitas poner la fecha de la carrera');
      http.expectNone(request => request.method === 'PUT');
    });
  }
});
