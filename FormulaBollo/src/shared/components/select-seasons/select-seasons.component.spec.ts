import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { SeasonApiService } from '../../services/api/season-api.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { Season } from '../../models/season';
import { ERROR_DRIVER_NAME_NOT_FOUND, ERROR_TEAM_NAME_NOT_FOUND } from '../../../app/constants';
import { SelectSeasonsComponent } from './select-seasons.component';

describe('SelectSeasonsComponent', () => {
  const first = new Season(42, 'Primera', 2);
  const last = new Season(43, 'Última', 3);
  let api: jasmine.SpyObj<SeasonApiService>;
  let fixture: ComponentFixture<SelectSeasonsComponent>;
  let component: SelectSeasonsComponent;
  let emit: jasmine.Spy;

  beforeEach(() => {
    api = jasmine.createSpyObj('SeasonApiService', [
      'getSeasons', 'getSeasonOfFantasy', 'getSeasonByDriverName', 'getSeasonByTeamName'
    ]);
    for (const method of [api.getSeasons, api.getSeasonOfFantasy, api.getSeasonByDriverName, api.getSeasonByTeamName]) {
      method.and.returnValue(of([first, last]));
    }
    TestBed.configureTestingModule({
      imports: [SelectSeasonsComponent],
      providers: [...provideComponentTesting(), { provide: SeasonApiService, useValue: api }]
    });
    fixture = TestBed.createComponent(SelectSeasonsComponent);
    component = fixture.componentInstance;
    emit = spyOn(component.seasonChanged, 'emit');
  });

  afterEach(() => fixture.destroy());

  it('selects the latest season and emits a user selection once', () => {
    fixture.detectChanges();
    expect(api.getSeasons).toHaveBeenCalledTimes(1);
    expect(component.seasons()).toEqual([first, last]);
    expect(emit).toHaveBeenCalledOnceWith(last);
    emit.calls.reset();
    component.seasonForm.get('season')!.setValue(first);
    expect(emit).toHaveBeenCalledOnceWith(first);
  });

  it('loads only Fantasy seasons when requested', () => {
    fixture.componentRef.setInput('fantasy', true);
    fixture.detectChanges();
    expect(api.getSeasonOfFantasy).toHaveBeenCalledTimes(1);
    expect(api.getSeasons).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledOnceWith(last);
  });

  for (const entity of ['driver', 'team'] as const) {
    it(`loads ${entity} seasons and prepends Total`, () => {
      fixture.componentRef.setInput(`${entity}Name`, 'Nombre de prueba');
      fixture.detectChanges();
      const request = entity === 'driver' ? api.getSeasonByDriverName : api.getSeasonByTeamName;
      expect(request).toHaveBeenCalledOnceWith('Nombre de prueba');
      expect(component.seasons().map(season => season.number)).toEqual([0, 2, 3]);
      expect(emit).toHaveBeenCalledOnceWith(component.seasons()[0]);
    });

    it(`redirects and warns when ${entity} has no seasons`, () => {
      const request = entity === 'driver' ? api.getSeasonByDriverName : api.getSeasonByTeamName;
      request.and.returnValue(of([]));
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
      fixture.componentRef.setInput(`${entity}Name`, 'Ausente');
      fixture.detectChanges();
      expect(navigate).toHaveBeenCalledOnceWith([entity === 'driver' ? '/drivers' : '/teams']);
      expect(notify).toHaveBeenCalledOnceWith(entity === 'driver' ? ERROR_DRIVER_NAME_NOT_FOUND : ERROR_TEAM_NAME_NOT_FOUND, '');
    });
  }

  it('includes Total for general statistics', () => {
    fixture.componentRef.setInput('statistics', 'general');
    fixture.detectChanges();
    expect(component.seasons().map(season => season.name)).toEqual(['Total', 'Primera', 'Última']);
    expect(emit).toHaveBeenCalledOnceWith(component.seasons()[0]);
  });

  it('clears a general empty selection without emitting a season', () => {
    api.getSeasons.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component.seasons()).toEqual([]);
    expect(component.seasonForm.get('season')!.value).toBeNull();
    expect(emit).not.toHaveBeenCalled();
  });

  it('reports a load error without emitting and recovers when the input changes', () => {
    const error = new Error('offline');
    api.getSeasons.and.returnValue(throwError(() => error));
    const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
    fixture.detectChanges();
    expect(notify).toHaveBeenCalledOnceWith('No se pudieron cargar las temporadas', error);
    expect(emit).not.toHaveBeenCalled();
    fixture.componentRef.setInput('fantasy', true);
    fixture.detectChanges();
    expect(component.seasons()).toEqual([first, last]);
    expect(emit).toHaveBeenCalledOnceWith(last);
  });
});
