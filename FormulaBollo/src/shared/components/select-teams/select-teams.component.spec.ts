import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { driverPointsFixture, provideComponentTesting } from '../../../testing/component-test-providers';
import { TeamApiService } from '../../services/api/team-api.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { Season } from '../../models/season';
import { ERROR_TEAM_FETCH } from '../../../app/constants';
import { SelectTeamsComponent } from './select-teams.component';

describe('SelectTeamsComponent', () => {
  let component: SelectTeamsComponent;
  let fixture: ComponentFixture<SelectTeamsComponent>;
  let api: jasmine.SpyObj<TeamApiService>;
  const first = driverPointsFixture.driver.team;
  const second = { ...first, id: 2, name: 'Segundo' };
  const season = new Season(42, 'Historica', 2);

  beforeEach(() => {
    api = jasmine.createSpyObj('TeamApiService', ['getAllTeams']);
    api.getAllTeams.and.returnValue(of([first, second]));
    TestBed.configureTestingModule({
      imports: [SelectTeamsComponent],
      providers: [...provideComponentTesting(), { provide: TeamApiService, useValue: api }]
    });
    fixture = TestBed.createComponent(SelectTeamsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('season', season);
  });

  afterEach(() => fixture.destroy());

  it('loads by season number, preselects by position and emits user choices once', () => {
    fixture.componentRef.setInput('position', 1);
    const emit = spyOn(component.teamChanged, 'emit');
    fixture.detectChanges();
    expect(api.getAllTeams).toHaveBeenCalledOnceWith(2);
    expect(component.teams()).toEqual([first, second]);
    expect(component.teamsForm.get('team')!.value).toBe(second);
    expect(emit).toHaveBeenCalledOnceWith(second);
    emit.calls.reset();
    component.teamsForm.get('team')!.setValue(first);
    expect(emit).toHaveBeenCalledOnceWith(first);
  });

  it('reloads for a changed season', () => {
    fixture.detectChanges();
    api.getAllTeams.and.returnValue(of([second]));
    fixture.componentRef.setInput('season', new Season(43, 'Siguiente', 3));
    fixture.detectChanges();
    expect(api.getAllTeams.calls.allArgs()).toEqual([[2], [3]]);
    expect(component.teams()).toEqual([second]);
  });

  it('accepts an empty list without inventing an option', () => {
    api.getAllTeams.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component.teams()).toEqual([]);
    expect(component.teamsForm.get('team')!.value).toBeFalsy();
  });

  it('reports and rethrows an API error, then permits another load', () => {
    fixture.detectChanges();
    const error = new Error('offline');
    const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
    spyOn(console, 'log');
    api.getAllTeams.and.returnValue(throwError(() => error));
    // RxJS schedules exceptions thrown inside error callbacks with setTimeout.
    jasmine.clock().install();
    try {
      component.obtainAllTeams();
      expect(notify).toHaveBeenCalledOnceWith(ERROR_TEAM_FETCH, error);
      expect(() => jasmine.clock().tick(0)).toThrow(error);
    } finally {
      jasmine.clock().uninstall();
    }
    api.getAllTeams.and.returnValue(of([second]));
    component.obtainAllTeams();
    expect(component.teams()).toEqual([second]);
  });
});
