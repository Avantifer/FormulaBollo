import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { provideComponentTesting, driverPointsFixture } from '../../../../testing/component-test-providers';
import { SelectDriversComponent } from '../../../../shared/components/select-drivers/select-drivers.component';
import { Driver } from '../../../../shared/models/driver';
import { Position } from '../../../../shared/models/position';
import { Race } from '../../../../shared/models/race';
import { Result } from '../../../../shared/models/result';
import { Sprint } from '../../../../shared/models/sprint';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { SprintApiService } from '../../../../shared/services/api/sprint-api.service';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';
import { AdminResultsComponent } from './admin-results.component';

describe('AdminResultsComponent', () => {
  let component: AdminResultsComponent;
  let fixture: ComponentFixture<AdminResultsComponent>;
  let resultApi: jasmine.SpyObj<ResultApiService>;
  let sprintApi: jasmine.SpyObj<SprintApiService>;
  let raceApi: jasmine.SpyObj<RaceApiService>;
  let fantasyApi: jasmine.SpyObj<FantasyApiService>;
  let messages: jasmine.SpyObj<MessageInfoService>;
  let drivers: Driver[];
  let race: Race;

  beforeEach(async () => {
    drivers = [1, 2, 3, 4].map(id => ({
      ...driverPointsFixture.driver, id, name: `Piloto ${id}`, number: id,
    }));
    race = new Race(11, 'Carrera A', 'flag.png', 'circuit.png',
      new Date('2026-05-01T10:00:00Z'), drivers[0].season, 0);
    resultApi = jasmine.createSpyObj<ResultApiService>('ResultApiService',
      ['getAllResultsPerRacePilots', 'saveResults']);
    sprintApi = jasmine.createSpyObj<SprintApiService>('SprintApiService',
      ['getAllSprintPerRace', 'saveSprints']);
    raceApi = jasmine.createSpyObj<RaceApiService>('RaceApiService', ['getAllRaces', 'saveRace']);
    fantasyApi = jasmine.createSpyObj<FantasyApiService>('FantasyApiService',
      ['saveDriverTeamPoints', 'saveDriverTeamPrices']);
    messages = jasmine.createSpyObj<MessageInfoService>('MessageInfoService',
      ['showSuccess', 'showError', 'showWarn']);
    resultApi.getAllResultsPerRacePilots.and.returnValue(of([]));
    resultApi.saveResults.and.returnValue(of('Resultados guardados'));
    sprintApi.getAllSprintPerRace.and.returnValue(of([]));
    sprintApi.saveSprints.and.returnValue(of('Sprint guardado'));
    // Keep the real race selector idle until the test explicitly selects a race.
    raceApi.getAllRaces.and.returnValue(NEVER);
    raceApi.saveRace.and.returnValue(of('Carrera guardada'));
    fantasyApi.saveDriverTeamPoints.and.returnValue(of('Puntos guardados'));
    fantasyApi.saveDriverTeamPrices.and.returnValue(of('Precios guardados'));

    await TestBed.configureTestingModule({
      imports: [AdminResultsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: DriverApiService, useValue: { getAllDrivers: () => of(drivers) } },
        { provide: ResultApiService, useValue: resultApi },
        { provide: SprintApiService, useValue: sprintApi },
        { provide: RaceApiService, useValue: raceApi },
        { provide: FantasyApiService, useValue: fantasyApi },
        { provide: MessageInfoService, useValue: messages },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    spyOn(console, 'error');
  });

  afterEach(() => fixture?.destroy());

  async function settle(): Promise<void> {
    // The save sequence also uses plain RxJS promises, outside Angular's pending tasks.
    for (let turn = 0; turn < 8; turn++) await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function complete(subject: Subject<string>, message: string): void {
    subject.next(message);
    subject.complete();
  }

  function selectNewRace(sprint = false): void {
    component.isSprint = sprint;
    component.onRaceChange(race);
    component.onDriverChangeResult(drivers[0], 0);
    component.onDriverChangeFastLap(drivers[0]);
    component.onDriverChangePole(drivers[0]);
  }

  function saveButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('p-button.saveResults button');
  }

  function selectLoadedRace(sprint: boolean): Result[] {
    const rows = [
      new Result(race, drivers[0], new Position(1, 1, 25), 1, 1),
      new Result(race, drivers[1], null, 0, 0),
      new Result(race, drivers[2], new Position(3, 3, 15), 0, 0),
      new Result(race, drivers[3], null, 0, 0),
    ];
    component.isSprint = sprint;
    if (sprint) sprintApi.getAllSprintPerRace.and.returnValue(of(rows));
    else resultApi.getAllResultsPerRacePilots.and.returnValue(of(rows));
    component.onRaceChange(race);
    return rows;
  }

  function savedRows(sprint: boolean): (Result | Sprint)[] {
    return (sprint ? sprintApi.saveSprints.calls.mostRecent()?.args[0]
      : resultApi.saveResults.calls.mostRecent()?.args[0]) ?? [];
  }

  it('should create', () => expect(component).toBeTruthy());

  for (const sprint of [false, true]) {
    it(`shows save, conditionally shows delete and opens its dialog for ${sprint ? 'sprints' : 'results'}`, async () => {
      component.isSprint = sprint;
      await settle();
      expect(saveButton()).not.toBeNull();
      expect(fixture.nativeElement.querySelector('p-button.deleteResults')).toBeNull();
      expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

      selectLoadedRace(sprint);
      await settle();
      const deleteButton: HTMLButtonElement = fixture.nativeElement.querySelector('p-button.deleteResults button');
      expect(deleteButton).not.toBeNull();
      expect(deleteButton.textContent).toContain(sprint ? 'Borrar Sprints' : 'Borrar Resultados');
      expect(saveButton().textContent).toContain(sprint ? 'Guardar Sprints' : 'Guardar Resultados');
      deleteButton.click();
      await settle();

      const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
      expect(component.visible()).toBeTrue();
      expect(dialog).not.toBeNull();
      expect(dialog.textContent).toContain('Confirmar Borrado');
      expect(dialog.textContent).toContain('¿Estás seguro de que quieres borrar todos los resultados?');
    });
  }

  it('marks the race finished only after results have been saved successfully', async () => {
    selectNewRace();
    const savingResults = new Subject<string>();
    const savingRace = new Subject<string>();
    resultApi.saveResults.and.returnValue(savingResults);
    raceApi.saveRace.and.returnValue(savingRace);
    component.saveResults();
    expect(resultApi.saveResults).toHaveBeenCalledTimes(1);
    expect(raceApi.saveRace).not.toHaveBeenCalled();
    expect(fantasyApi.saveDriverTeamPoints).not.toHaveBeenCalled();
    complete(savingResults, 'Resultados guardados');
    await settle();
    expect(raceApi.saveRace).toHaveBeenCalledTimes(1);
    expect(raceApi.saveRace.calls.mostRecent().args[0].finished).toBe(1);
    expect(fantasyApi.saveDriverTeamPoints).not.toHaveBeenCalled();
    complete(savingRace, 'Carrera guardada');
    await settle();
    expect(fantasyApi.saveDriverTeamPoints).toHaveBeenCalledOnceWith(11);
    expect(fantasyApi.saveDriverTeamPrices).toHaveBeenCalledOnceWith(11);
  });

  it('stops on a results save error without finishing or mutating the cached race', async () => {
    selectNewRace();
    const originalDate = race.dateStart;
    const error = new Error('No se guardaron los resultados');
    resultApi.saveResults.and.returnValue(throwError(() => error));
    component.saveResults();
    await settle();
    expect(raceApi.saveRace).not.toHaveBeenCalled();
    expect(fantasyApi.saveDriverTeamPoints).not.toHaveBeenCalled();
    expect(fantasyApi.saveDriverTeamPrices).not.toHaveBeenCalled();
    expect(messages.showError).toHaveBeenCalledWith(error, error);
    expect(messages.showSuccess).not.toHaveBeenCalled();
    expect(race.finished).toBe(0);
    expect(race.dateStart).toBe(originalDate);
  });

  it('stops the sequence and unlocks saving when finishing the race fails', async () => {
    selectNewRace();
    const error = new Error('No se pudo terminar la carrera');
    raceApi.saveRace.and.returnValue(throwError(() => error));
    component.saveResults();
    await settle();
    expect(resultApi.saveResults).toHaveBeenCalledTimes(1);
    expect(fantasyApi.saveDriverTeamPoints).not.toHaveBeenCalled();
    expect(fantasyApi.saveDriverTeamPrices).not.toHaveBeenCalled();
    expect(messages.showError).toHaveBeenCalledWith(error, error);
    expect(saveButton().disabled).toBeFalse();
    expect(race.finished).toBe(0);
  });

  it('stops after a Fantasy points error and never calculates prices', async () => {
    selectNewRace();
    const error = new Error('No se guardaron los puntos');
    fantasyApi.saveDriverTeamPoints.and.returnValue(throwError(() => error));
    component.saveResults();
    await settle();
    expect(fantasyApi.saveDriverTeamPrices).not.toHaveBeenCalled();
    expect(messages.showError).toHaveBeenCalledWith(error, error);
    expect(messages.showSuccess).not.toHaveBeenCalledWith('Precios guardados');
    expect(saveButton().disabled).toBeFalse();
  });

  it('reports a Fantasy prices error and releases the save button', async () => {
    selectNewRace();
    const error = new Error('No se guardaron los precios');
    fantasyApi.saveDriverTeamPrices.and.returnValue(throwError(() => error));
    component.saveResults();
    await settle();
    expect(messages.showError).toHaveBeenCalledWith(error, error);
    expect(messages.showSuccess).not.toHaveBeenCalledWith('Precios guardados');
    expect(saveButton().disabled).toBeFalse();
  });

  it('saves a sprint without marking the race finished or running Fantasy', async () => {
    selectNewRace(true);
    component.saveResults();
    await settle();
    expect(sprintApi.saveSprints).toHaveBeenCalledTimes(1);
    expect(raceApi.saveRace).not.toHaveBeenCalled();
    expect(fantasyApi.saveDriverTeamPoints).not.toHaveBeenCalled();
    expect(fantasyApi.saveDriverTeamPrices).not.toHaveBeenCalled();
    expect(race.finished).toBe(0);
  });

  for (const sprint of [false, true]) {
    const label = sprint ? 'sprints' : 'results';

    it(`assigns the selected grid positions when creating ${label}`, async () => {
      selectNewRace(sprint);
      component.onDriverChangeResult(drivers[1], 1);
      component.saveResults();
      await settle();
      expect(savedRows(sprint).map(row => [row.driver.id, row.position?.positionNumber ?? null])).toEqual([
        [1, 1], [2, 2], [3, null], [4, null],
      ]);
    });

    it(`blocks duplicate ${label} submissions and unlocks after a save error`, async () => {
      selectNewRace(sprint);
      const pending = new Subject<string>();
      if (sprint) sprintApi.saveSprints.and.returnValue(pending);
      else resultApi.saveResults.and.returnValue(pending);
      const save = sprint ? sprintApi.saveSprints : resultApi.saveResults;
      component.saveResults();
      await settle();
      expect(saveButton().disabled).toBeTrue();
      component.saveResults();
      expect(save).toHaveBeenCalledTimes(1);
      const error = new Error('Error guardando');
      pending.error(error);
      await settle();
      expect(messages.showError).toHaveBeenCalledWith(error, error);
      expect(saveButton().disabled).toBeFalse();
      if (sprint) sprintApi.saveSprints.and.returnValue(of('Sprint guardado'));
      else resultApi.saveResults.and.returnValue(of('Resultados guardados'));
      component.saveResults();
      await settle();
      expect(save).toHaveBeenCalledTimes(2);
    });

    it(`cancels the previous ${label} load and ignores its late response after selecting another race`, async () => {
      component.isSprint = sprint;
      const pendingA = new Subject<Result[]>();
      const pendingB = new Subject<Result[]>();
      const cancelledA = jasmine.createSpy('cancelled load A');
      const requestA = new Observable<Result[]>(subscriber => {
        const subscription = pendingA.subscribe(subscriber);
        return () => { subscription.unsubscribe(); cancelledA(); };
      });
      const raceB = { ...race, id: 22, name: 'Carrera B' };
      if (sprint) sprintApi.getAllSprintPerRace.and.callFake(id => id === 11 ? requestA : pendingB);
      else resultApi.getAllResultsPerRacePilots.and.callFake(id => id === 11 ? requestA : pendingB);
      component.onRaceChange(race);
      component.onRaceChange(raceB);
      expect(cancelledA).toHaveBeenCalledTimes(1);
      const rowB = new Result(raceB, drivers[1], new Position(1, 1, 25), 1, 1);
      pendingB.next([rowB]);
      pendingB.complete();
      pendingA.next([new Result(race, drivers[0], new Position(1, 1, 25), 1, 1)]);
      pendingA.complete();
      await settle();
      const rows = sprint ? component.sprints() : component.results();
      expect(component.raceSelected?.id).toBe(22);
      expect(rows.map(row => [row.race.id, row.driver.id])).toEqual([[22, 2]]);
      if (!sprint) {
        expect(component.fastlapDriver()?.id).toBe(2);
        expect(component.poleDriver()?.id).toBe(2);
      }
    });

    it(`blocks saving ${label} during a load and after a load error until a successful reload`, async () => {
      component.isSprint = sprint;
      const pending = new Subject<Result[]>();
      if (sprint) sprintApi.getAllSprintPerRace.and.returnValue(pending);
      else resultApi.getAllResultsPerRacePilots.and.returnValue(pending);
      component.onRaceChange(race);
      component.onDriverChangeResult(drivers[0], 0);
      component.onDriverChangeFastLap(drivers[0]);
      component.onDriverChangePole(drivers[0]);
      await settle();
      expect(saveButton().disabled).toBeTrue();
      component.saveResults();
      expect(resultApi.saveResults).not.toHaveBeenCalled();
      expect(sprintApi.saveSprints).not.toHaveBeenCalled();
      pending.error(new Error('Error cargando'));
      await settle();
      component.saveResults();
      expect(saveButton().disabled).toBeTrue();
      expect(resultApi.saveResults).not.toHaveBeenCalled();
      expect(sprintApi.saveSprints).not.toHaveBeenCalled();
      expect(messages.showError).toHaveBeenCalled();
      if (sprint) sprintApi.getAllSprintPerRace.and.returnValue(of([]));
      else resultApi.getAllResultsPerRacePilots.and.returnValue(of([]));
      selectNewRace(sprint);
      await settle();
      expect(saveButton().disabled).toBeFalse();
      component.saveResults();
      await settle();
      expect(sprint ? sprintApi.saveSprints : resultApi.saveResults).toHaveBeenCalledTimes(1);
    });

    it(`preserves every loaded ${label} row without depending on child selector emissions`, async () => {
      selectLoadedRace(sprint);
      // Saving before rendering the child selectors exercises the parent-owned model.
      component.saveResults();
      await settle();
      expect(sprint ? sprintApi.saveSprints : resultApi.saveResults).toHaveBeenCalledTimes(1);
      expect(savedRows(sprint).map(row => [row.driver.id, row.position?.positionNumber ?? null])).toEqual([
        [1, 1], [2, null], [3, 3], [4, null],
      ]);
    });

    it(`includes retired-driver selector edits in ${label} while preserving null and original positions`, async () => {
      const original = selectLoadedRace(sprint);
      await settle();
      const selectors = fixture.debugElement.queryAll(By.directive(SelectDriversComponent))
        .map(element => element.componentInstance as SelectDriversComponent);
      const offset = sprint ? 0 : 2;
      const classified = selectors.slice(offset).find(selector => selector.driverId === 3)!;
      const retired = selectors.slice(offset).find(selector => selector.driverId === 2)!;
      classified.driverChanged.emit(drivers[1]);
      retired.driverChanged.emit(drivers[2]);
      component.saveResults();
      await settle();
      expect(savedRows(sprint).map(row => [row.driver.id, row.position?.positionNumber ?? null])).toEqual([
        [1, 1], [3, null], [2, 3], [4, null],
      ]);
      expect(original.map(row => [row.driver.id, row.position?.positionNumber ?? null])).toEqual([
        [1, 1], [2, null], [3, 3], [4, null],
      ]);
    });

    it(`sends the edited calendar date in ${label} without mutating the cached race`, async () => {
      selectNewRace(sprint);
      const originalDate = race.dateStart;
      component.raceDate = new Date('2026-06-02T14:30:00Z');
      component.saveResults();
      await settle();
      const payload = savedRows(sprint);
      expect(new Date(payload[0].race.dateStart).toISOString()).toBe('2026-06-02T14:30:00.000Z');
      expect(payload[0].race).not.toBe(race);
      expect(race.dateStart).toBe(originalDate);
      expect(race.dateStart.toISOString()).toBe('2026-05-01T10:00:00.000Z');
      expect(race.finished).toBe(0);
      if (!sprint) {
        const savedRace = raceApi.saveRace.calls.mostRecent().args[0];
        expect(new Date(savedRace.dateStart).toISOString()).toBe('2026-06-02T14:30:00.000Z');
        expect(savedRace).not.toBe(race);
      }
    });
  }

  it('keeps saving locked through the final Fantasy step and unlocks on completion', async () => {
    selectNewRace();
    const pendingPrices = new Subject<string>();
    fantasyApi.saveDriverTeamPrices.and.returnValue(pendingPrices);
    component.saveResults();
    await settle();
    expect(fantasyApi.saveDriverTeamPrices).toHaveBeenCalledTimes(1);
    expect(saveButton().disabled).toBeTrue();
    component.saveResults();
    expect(resultApi.saveResults).toHaveBeenCalledTimes(1);
    complete(pendingPrices, 'Precios guardados');
    await settle();
    expect(saveButton().disabled).toBeFalse();
  });

  it('uses the original save snapshot when the selected race changes during submission', async () => {
    selectNewRace();
    const pendingResults = new Subject<string>();
    resultApi.saveResults.and.returnValue(pendingResults);
    component.raceDate = new Date('2026-06-02T14:30:00Z');
    component.saveResults();
    component.onRaceChange({ ...race, id: 22, name: 'Carrera B' });
    component.raceDate = new Date('2026-07-03T15:00:00Z');
    complete(pendingResults, 'Resultados guardados');
    await settle();
    expect(raceApi.saveRace.calls.mostRecent().args[0].id).toBe(11);
    expect(new Date(raceApi.saveRace.calls.mostRecent().args[0].dateStart).toISOString())
      .toBe('2026-06-02T14:30:00.000Z');
    expect(fantasyApi.saveDriverTeamPoints).toHaveBeenCalledOnceWith(11);
    expect(fantasyApi.saveDriverTeamPrices).toHaveBeenCalledOnceWith(11);
  });
});
