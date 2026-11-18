import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { RaceApiService } from '../../services/api/race-api.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { Race } from '../../models/race';
import { Season } from '../../models/season';
import { ERROR_RACE_FETCH } from '../../../app/constants';
import { SelectRacesComponent } from './select-races.component';

describe('SelectRacesComponent', () => {
  const season = new Season(42, 'Histórica', 2);
  const first = new Race(10, 'Primera', '', '', new Date('2026-01-01'), season, 1);
  const last = { ...first, id: 11, name: 'Última' };
  let api: jasmine.SpyObj<RaceApiService>;
  let fixture: ComponentFixture<SelectRacesComponent>;
  let component: SelectRacesComponent;
  let emit: jasmine.Spy;

  beforeEach(() => {
    api = jasmine.createSpyObj('RaceApiService', ['getAllRaces', 'getAllRacesFinishedAndActual']);
    api.getAllRaces.and.returnValue(of([first, last]));
    api.getAllRacesFinishedAndActual.and.returnValue(of([first, last]));
    TestBed.configureTestingModule({
      imports: [SelectRacesComponent],
      providers: [...provideComponentTesting(), { provide: RaceApiService, useValue: api }]
    });
    fixture = TestBed.createComponent(SelectRacesComponent);
    component = fixture.componentInstance;
    emit = spyOn(component.raceChanged, 'emit');
    fixture.componentRef.setInput('season', season);
  });

  afterEach(() => fixture.destroy());

  it('loads by season number and emits each form choice once', () => {
    fixture.detectChanges();
    expect(api.getAllRaces).toHaveBeenCalledOnceWith(2);
    expect(component.races()).toEqual([first, last]);
    expect(emit).toHaveBeenCalledOnceWith(first);
    emit.calls.reset();
    component.racesForm.get('race')!.setValue(last);
    expect(emit).toHaveBeenCalledOnceWith(last);
  });

  it('preserves a race by name across seasons, replacing the old object', () => {
    fixture.detectChanges();
    component.racesForm.get('race')!.setValue(last);
    const replacement = { ...last, id: 22, season: new Season(43, 'Siguiente', 3) };
    api.getAllRaces.and.returnValue(of([replacement]));
    fixture.componentRef.setInput('season', replacement.season);
    fixture.detectChanges();
    expect(api.getAllRaces).toHaveBeenCalledWith(3);
    expect(component.racesForm.get('race')!.value).toBe(replacement);
    expect(emit.calls.mostRecent().args).toEqual([replacement]);
  });

  it('falls back to the first race when the previous name is absent', () => {
    fixture.detectChanges();
    component.racesForm.get('race')!.setValue(last);
    api.getAllRaces.and.returnValue(of([first]));
    component.obtainAllRaces();
    expect(component.racesForm.get('race')!.value).toBe(first);
  });

  it('loads finished and current races for Fantasy team and selects the last', () => {
    fixture.componentRef.setInput('fantasyTeam', true);
    fixture.detectChanges();
    expect(api.getAllRaces).not.toHaveBeenCalled();
    expect(api.getAllRacesFinishedAndActual).toHaveBeenCalledOnceWith(2);
    expect(component.racesForm.get('race')!.value).toBe(last);
    expect(emit).toHaveBeenCalledOnceWith(last);
  });

  it('adds Total for Fantasy and emits it through the form and explicitly', () => {
    // La respuesta llega después de la suscripción, como en una petición HTTP.
    const response = new Subject<Race[]>();
    api.getAllRaces.and.returnValue(response);
    fixture.componentRef.setInput('fantasy', true);
    fixture.detectChanges();
    response.next([first, last]);
    response.complete();
    expect(api.getAllRaces).toHaveBeenCalledOnceWith(2);
    const total = component.races()[0];
    expect(total).toEqual(jasmine.objectContaining({ id: 0, name: 'Total' }));
    expect(component.races()).toEqual([total, first, last]);
    expect(component.racesForm.get('race')!.value).toBe(total);
    expect(emit.calls.allArgs()).toEqual([[total], [total]]);
  });

  for (const fantasyTeam of [false, true]) {
    it(`handles an empty list (fantasyTeam=${fantasyTeam})`, () => {
      api.getAllRaces.and.returnValue(of([]));
      api.getAllRacesFinishedAndActual.and.returnValue(of([]));
      fixture.componentRef.setInput('fantasyTeam', fantasyTeam);
      fixture.detectChanges();
      expect(component.races()).toEqual([]);
      if (fantasyTeam) {
        expect(component.racesForm.get('race')!.value).toBeNull();
        expect(emit).not.toHaveBeenCalled();
      } else {
        expect(component.racesForm.get('race')!.value).toBeUndefined();
        expect(emit).toHaveBeenCalledOnceWith(undefined);
      }
    });

    it(`reports an API error and supports another load (fantasyTeam=${fantasyTeam})`, () => {
      const request = fantasyTeam ? api.getAllRacesFinishedAndActual : api.getAllRaces;
      const error = new Error('offline');
      request.and.returnValue(throwError(() => error));
      const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
      spyOn(console, 'error');
      fixture.componentRef.setInput('fantasyTeam', fantasyTeam);
      fixture.detectChanges();
      expect(notify).toHaveBeenCalledOnceWith(ERROR_RACE_FETCH, error);
      expect(component.races()).toEqual([]);
      expect(emit).not.toHaveBeenCalled();
      request.and.returnValue(of([first]));
      if (fantasyTeam) component.racesFinishedAndActual();
      else component.obtainAllRaces();
      expect(emit).toHaveBeenCalledOnceWith(first);
    });
  }
});
