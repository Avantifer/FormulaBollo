import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, Subject } from 'rxjs';
import { provideComponentTesting, teamPointsFixture } from '../../../../testing/component-test-providers';
import { Team } from '../../../../shared/models/team';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { environment } from '../../../../enviroments/enviroment';
import { ERROR_TEAM_FETCH } from '../../../constants';
import { HomeTeamsComponent } from './home-teams.component';

describe('HomeTeamsComponent', () => {
  let component: HomeTeamsComponent;
  let fixture: ComponentFixture<HomeTeamsComponent>;
  let response: Subject<Team[]>;
  let getAllTeams: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeTeamsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    response = new Subject<Team[]>();
    getAllTeams = spyOn(TestBed.inject(TeamApiService), 'getAllTeams').and.returnValue(response);
    fixture = TestBed.createComponent(HomeTeamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows an empty state without skeletons when the API returns no teams', () => {
    response.next([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent)
      .toContain('No hay escuderías para esta temporada.');
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an error and retries the request when Reintentar is clicked', () => {
    const error = new Error('offline');
    const handleError = spyOn(TestBed.inject(UtilsService), 'handleError').and.returnValue(EMPTY);
    response.error(error);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent)
      .toContain('No se pudieron cargar las escuderías.');
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(handleError).toHaveBeenCalledWith(ERROR_TEAM_FETCH, error);
    const retry = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(retry.textContent).toContain('Reintentar');
    response = new Subject<Team[]>();
    getAllTeams.and.returnValue(response);
    retry.click();
    fixture.detectChanges();
    expect(getAllTeams).toHaveBeenCalledTimes(2);
    expect(getAllTeams).toHaveBeenCalledWith(environment.seasonActual.number);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(10);
    response.next([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('shows team cards without skeletons or messages after a successful request', () => {
    response.next([teamPointsFixture.team]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/teams/Ferrari"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(0);
    expect(fixture.nativeElement.querySelector('[role="status"], [role="alert"]')).toBeNull();
  });

  it('shows skeletons while the request is pending', () => {
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(10);
    expect(fixture.nativeElement.querySelector('[role="status"], [role="alert"]')).toBeNull();
  });

  it('keeps dark logos on light bordered badges without changing cell height in either theme', () => {
    response.next(['Aston Martin', 'Alpine', 'RB'].map((name, id) => ({ ...teamPointsFixture.team, name, id })));
    fixture.detectChanges();
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    try {
      for (const dark of [false, true]) {
        root.classList.toggle('dark', dark);
        const logos = fixture.nativeElement.querySelectorAll('.teams-schema-container-image') as NodeListOf<HTMLImageElement>;
        expect(logos.length).toBe(3);
        for (const logo of Array.from(logos)) {
          const style = getComputedStyle(logo);
          expect(style.backgroundColor).toBe('rgb(233, 236, 239)');
          expect(style.borderTopWidth).toBe('1px');
          expect(style.filter).toBe('none');
          expect(logo.classList.contains('reverse-color')).toBeFalse();
          expect(logo.getBoundingClientRect().width).toBe(96);
          expect(logo.getBoundingClientRect().height).toBe(96);
          expect(logo.closest('a')!.getBoundingClientRect().height).toBe(144);
        }
      }
    } finally { root.classList.toggle('dark', wasDark); }
  });
});
