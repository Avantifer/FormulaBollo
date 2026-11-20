import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Params, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { provideComponentTesting, driverPointsFixture, teamPointsFixture } from '../../../testing/component-test-providers';
import { SeasonApiService } from '../../../shared/services/api/season-api.service';
import { TeamApiService } from '../../../shared/services/api/team-api.service';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { TeamsRankingComponent } from './teams-ranking/teams-ranking.component';
import { TeamsComponent } from './teams.component';

describe('TeamsComponent', () => {
  let fixture: ComponentFixture<TeamsComponent>;
  let navigate: jasmine.Spy;
  const team = driverPointsFixture.driver.team;
  const season = driverPointsFixture.driver.season;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TeamsComponent], providers: provideComponentTesting() });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(TestBed.inject(SeasonApiService), 'getSeasons').and.returnValue(of([season, environment.seasonActual]));
    spyOn(TestBed.inject(TeamApiService), 'getAllTeams').and.returnValue(of(Array.from({ length: 12 }, (_, id) => ({ ...team, id, name: id === 0 ? 'Ferrari' : 'Equipo ' + id }))));
    spyOn(TestBed.inject(TeamApiService), 'getllTeamsWithDrivers').and.returnValue(of([
      { ...teamPointsFixture, totalPoints: 200 },
      { ...teamPointsFixture, team: { ...team, id: 2, name: 'Equipo 1' }, totalPoints: 135 }
    ]));
    fixture = TestBed.createComponent(TeamsComponent);
  });

  afterEach(() => fixture.destroy());

  async function render() {
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 120));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function startAt(params: Params): void {
    fixture.destroy();
    Object.assign(TestBed.inject(ActivatedRoute).snapshot, { queryParamMap: convertToParamMap(params), queryParams: params });
    fixture = TestBed.createComponent(TeamsComponent);
  }

  function select(): SelectSeasonsComponent {
    return fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance;
  }

  function ranking(): TeamsRankingComponent {
    return fixture.debugElement.query(By.directive(TeamsRankingComponent)).componentInstance;
  }

  it('reads a valid season and decoded team names once and marks the controls', async () => {
    startAt({ season: '1', teams: 'Ferrari,Equipo 1,Inexistente,Ferrari' });
    await render();
    expect(select().seasonForm.get('season')!.value.number).toBe(1);
    expect(ranking().season().number).toBe(1);
    expect(ranking().selectedTeams()).toEqual(['Ferrari', 'Equipo 1']);
    for (const name of ['Ferrari', 'Equipo 1']) {
      expect(fixture.nativeElement.querySelector('button[aria-label="' + name + '"]').getAttribute('aria-pressed')).toBe('true');
    }
    expect(TestBed.inject(TeamApiService).getAllTeams).toHaveBeenCalledOnceWith(1);
    expect(navigate).toHaveBeenCalledOnceWith([], {
      relativeTo: TestBed.inject(ActivatedRoute), queryParams: { season: 1, teams: 'Ferrari,Equipo 1' }, queryParamsHandling: 'merge', replaceUrl: true
    });
    Object.assign(TestBed.inject(ActivatedRoute).snapshot, { queryParamMap: convertToParamMap({ season: '3', teams: 'Equipo 2' }) });
    fixture.detectChanges();
    expect(ranking().season().number).toBe(1);
    expect(ranking().selectedTeams()).toEqual(['Ferrari', 'Equipo 1']);
  });

  for (const seasonParam of ['incorrecta', '1extra', '1.5', '0', '-1', '999', '']) {
    it('ignores invalid or unavailable season ' + seasonParam + ' and unknown teams', async () => {
      startAt({ season: seasonParam, teams: 'No existe' });
      await render();
      expect(select().seasonForm.get('season')!.value.number).toBe(environment.seasonActual.number);
      expect(ranking().season().number).toBe(environment.seasonActual.number);
      expect(ranking().selectedTeams()).toEqual(['Todos los equipos']);
      expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ season: null, teams: null });
    });
  }

  it('validates teams only after the URL season has loaded asynchronously', async () => {
    const seasons = new Subject<typeof season[]>();
    const teams = new Subject<typeof team[]>();
    (TestBed.inject(SeasonApiService).getSeasons as jasmine.Spy).and.returnValue(seasons);
    (TestBed.inject(TeamApiService).getAllTeams as jasmine.Spy).and.returnValue(teams);
    startAt({ season: '1', teams: 'Ferrari,Equipo 1' });
    fixture.detectChanges();
    expect(TestBed.inject(TeamApiService).getAllTeams).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    seasons.next([season, environment.seasonActual]);
    fixture.detectChanges();
    expect(TestBed.inject(TeamApiService).getAllTeams).toHaveBeenCalledOnceWith(1);
    expect(navigate).not.toHaveBeenCalled();
    teams.next([team]);
    await render();
    expect(ranking().selectedTeams()).toEqual(['Ferrari']);
    expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ season: 1, teams: 'Ferrari' });
  });

  it('replaces query params on filter changes, clears teams on season change and omits defaults', async () => {
    await render();
    expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ season: null, teams: null });
    navigate.calls.reset();
    fixture.nativeElement.querySelector('button[aria-label="Equipo 1"]').click();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledOnceWith([], {
      relativeTo: TestBed.inject(ActivatedRoute), queryParams: { season: null, teams: 'Equipo 1' }, queryParamsHandling: 'merge', replaceUrl: true
    });
    fixture.nativeElement.querySelector('button[aria-label="Ferrari"]').click();
    fixture.detectChanges();
    expect(navigate.calls.mostRecent().args[1].queryParams.teams).toBe('Equipo 1,Ferrari');
    fixture.nativeElement.querySelector('button[aria-label="Todos los equipos"]').click();
    fixture.detectChanges();
    expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ season: null, teams: null });
    fixture.nativeElement.querySelector('button[aria-label="Ferrari"]').click();
    fixture.detectChanges();
    navigate.calls.reset();
    fixture.nativeElement.querySelectorAll('select-seasons button')[0].click();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledOnceWith([], {
      relativeTo: TestBed.inject(ActivatedRoute), queryParams: { season: 1, teams: null }, queryParamsHandling: 'merge', replaceUrl: true
    });
    expect(ranking().selectedTeams()).toEqual(['Todos los equipos']);
    expect(fixture.nativeElement.querySelector('button[aria-label="Ferrari"]').getAttribute('aria-pressed')).toBe('false');
    fixture.nativeElement.querySelectorAll('select-seasons button')[1].click();
    fixture.detectChanges();
    expect(navigate.calls.mostRecent().args[1].queryParams).toEqual({ season: null, teams: null });
  });

  it('renders season tabs without Total, the ranking and logo filters', async () => {
    await render();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Clasificación de escuderías');
    expect(fixture.nativeElement.querySelector('h2.sr-only').textContent).toBe('Escuderías');
    expect(fixture.nativeElement.querySelector('p-select, p-selectbutton, p-divider, drivers-teams-grid-table')).toBeNull();
    expect(select().variant()).toBe('tabs');
    expect(Array.from(fixture.nativeElement.querySelectorAll('select-seasons button'), (button: any) => button.textContent.trim())).toEqual(['T1 (Temporada 1)', 'T3 (Temporada 3)']);
    expect(fixture.nativeElement.querySelector('.team-logos')).not.toBeNull();
    expect(Array.from(fixture.nativeElement.querySelectorAll('button'), (button: any) => button.textContent).join(' ')).not.toContain('Filtros');
    expect(fixture.nativeElement.querySelectorAll('ol li').length).toBe(2);
  });

  it('propagates team selection and clears it through the filter when the season changes', async () => {
    await render();
    fixture.nativeElement.querySelector('button[aria-label="Ferrari"]').click();
    fixture.detectChanges();
    const ranking = fixture.debugElement.query(By.directive(TeamsRankingComponent)).componentInstance as TeamsRankingComponent;
    expect(ranking.selectedTeams()).toEqual(['Ferrari']);
    const select = fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
    select.seasonChanged.emit({ ...season, number: 2 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(ranking.season().number).toBe(2);
    expect(ranking.selectedTeams()).toEqual(['Todos los equipos']);
  });
});

@Component({ template: '<h1>Perfil de prueba</h1>' })
class ProfileStubComponent {}

describe('Teams route history', () => {
  it('encodes team names, preserves other params and restores the filtered season after profile/back', async () => {
    TestBed.configureTestingModule({
      imports: [TeamsComponent, ProfileStubComponent],
      providers: [
        ...provideComponentTesting(),
        provideLocationMocks(),
        provideRouter([
          { path: 'teams', component: TeamsComponent },
          { path: 'teams/:name', component: ProfileStubComponent }
        ]),
        { provide: ActivatedRoute, useFactory: () => TestBed.inject(Router).routerState.root }
      ]
    });
    const historical = driverPointsFixture.driver.season;
    const redBull = { ...driverPointsFixture.driver.team, id: 2, name: 'Red Bull' };
    spyOn(TestBed.inject(SeasonApiService), 'getSeasons').and.returnValue(of([historical, environment.seasonActual]));
    spyOn(TestBed.inject(TeamApiService), 'getAllTeams').and.returnValue(of([driverPointsFixture.driver.team, redBull]));
    spyOn(TestBed.inject(TeamApiService), 'getllTeamsWithDrivers').and.returnValue(of([
      teamPointsFixture, { ...teamPointsFixture, team: redBull }
    ]));

    const harness = await RouterTestingHarness.create('/teams?season=1&teams=Red%20Bull&extra=keep');
    async function settle(): Promise<void> {
      harness.detectChanges();
      await new Promise(resolve => setTimeout(resolve, 120));
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
    await settle();
    const router = TestBed.inject(Router);
    // The harness navigates without bootstrapping the app's popstate listener.
    router.initialNavigation();
    const filteredUrl = router.url;
    expect(filteredUrl).toContain('season=1');
    expect(filteredUrl).toContain('teams=Red%20Bull');
    expect(filteredUrl).toContain('extra=keep');
    const original = harness.routeDebugElement!.componentInstance;
    const link = harness.routeNativeElement!.querySelector<HTMLAnchorElement>('ol a')!;
    expect(harness.routeNativeElement!.querySelectorAll('ol a')).toHaveSize(1);
    expect(link.getAttribute('href')).toBe('/teams/Red_Bull');
    link.click();
    await settle();
    expect(router.url).toBe('/teams/Red_Bull');
    expect(harness.routeNativeElement!.textContent).toContain('Perfil de prueba');

    TestBed.inject(Location).back();
    await settle();
    expect(router.url).toBe(filteredUrl);
    expect(harness.routeDebugElement!.componentInstance).not.toBe(original);
    expect(harness.routeNativeElement!.querySelectorAll('ol a')).toHaveSize(1);
    expect(harness.routeNativeElement!.querySelector('ol a')?.getAttribute('href')).toBe('/teams/Red_Bull');
    expect(harness.routeNativeElement!.querySelector('button[aria-label="Red Bull"]')?.getAttribute('aria-pressed')).toBe('true');
    const select = harness.routeDebugElement!.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
    expect(select.seasonForm.get('season')!.value.number).toBe(1);
  });
});
