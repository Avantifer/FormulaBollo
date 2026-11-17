import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { provideComponentTesting, driverPointsFixture } from './component-test-providers';
import { FantasyRegisterComponent } from '../app/components/fantasy/fantasy-register/fantasy-register.component';
import { FantasyRecoverPasswordComponent } from '../app/components/fantasy/fantasy-recover-password/fantasy-recover-password.component';
import { AccountApiService } from '../shared/services/api/account-api.service';
import { SeasonApiService } from '../shared/services/api/season-api.service';
import { SelectSeasonsComponent } from '../shared/components/select-seasons/select-seasons.component';
import { ComparativeStatsComponent } from '../app/components/statistics/comparative-stats/comparative-stats.component';
import { DriversGridTableComponent } from '../shared/components/drivers-teams-grid-table/drivers-teams-grid-table.component';
import { DriverApiService } from '../shared/services/api/driver-api.service';
import { TeamApiService } from '../shared/services/api/team-api.service';
import { HomeTeamsComponent } from '../app/components/home/home-teams/home-teams.component';
import { HomeDriversComponent } from '../app/components/home/home-drivers/home-drivers.component';
import { RacesComponent } from '../app/components/races/races.component';
import { RaceApiService } from '../shared/services/api/race-api.service';
import { ResultApiService } from '../shared/services/api/result-api.service';
import { UtilsService } from '../shared/services/utils.service';
import { Season } from '../shared/models/season';
import { FooterComponent } from '../shared/components/footer/footer.component';
import { AuthJWTService } from '../shared/services/authJWT.service';
import { FantasyTeamComponent } from '../app/components/fantasy/fantasy-team/fantasy-team.component';
import { ThemeService } from '../shared/services/theme.service';
import { DriversInfoComponent } from '../app/components/drivers/drivers-info/drivers-info.component';
import { SelectRacesComponent } from '../shared/components/select-races/select-races.component';
import { DriverCardComponent } from '../app/components/drivers/driver-card/driver-card.component';
import { FantasyLoginComponent } from '../app/components/fantasy/fantasy-login/fantasy-login.component';

describe('Frontend regressions', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideComponentTesting() });
  });
  afterEach(() => localStorage.clear());

  for (const [type, formName, first, repeated, submit] of [
    [FantasyRegisterComponent, 'registerForm', 'password', 'passwordRepeated', 'register'],
    [FantasyRecoverPasswordComponent, 'recoverPasswordForm', 'password1', 'password2', 'recoverPassword']
  ] as const) {
    it(`${formName} revalidates both passwords and refuses invalid submissions`, () => {
      const component = TestBed.createComponent(type as typeof FantasyRegisterComponent).componentInstance as any;
      const form = component[formName] as FormGroup;
      form.patchValue({ username: 'user', mail: 'user@example.com', [first]: 'secret', [repeated]: 'secret' });
      expect(form.valid).toBeTrue();
      form.get(first)!.setValue('different');
      expect(form.hasError('passwordMismatch')).toBeTrue();
      const api = TestBed.inject(AccountApiService);
      const register = spyOn(api, 'register').and.returnValue(of('token'));
      const recover = spyOn(api, 'changePassword').and.returnValue(of('ok'));
      component[submit]();
      expect(register).not.toHaveBeenCalled();
      expect(recover).not.toHaveBeenCalled();
      form.patchValue({ [first]: 'é'.repeat(37), [repeated]: 'é'.repeat(37) });
      expect(form.valid).toBeFalse();
      form.patchValue({ [first]: 'é'.repeat(36), [repeated]: 'é'.repeat(36) });
      expect(form.valid).toBeTrue();
      form.patchValue({ [first]: 'a', [repeated]: 'a' });
      expect(form.valid).toBeTrue();
    });
  }

  it('loads seasons once using all inputs and emits each selection once', () => {
    const api = TestBed.inject(SeasonApiService);
    const all = spyOn(api, 'getSeasons').and.returnValue(of([]));
    const fantasy = spyOn(api, 'getSeasonOfFantasy').and.returnValue(of([new Season(1, 'One', 1)]));
    const specific = spyOn(api, 'getSeasonByDriverName').and.returnValue(of([new Season(2, 'Two', 2)]));
    const fixture = TestBed.createComponent(SelectSeasonsComponent);
    const emit = spyOn(fixture.componentInstance.seasonChanged, 'emit');
    fixture.componentRef.setInput('fantasy', true);
    fixture.detectChanges();
    expect(all).not.toHaveBeenCalled();
    expect(fantasy).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('driverName', 'Driver');
    fixture.detectChanges();
    expect(specific).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('cancels an obsolete season request when inputs change', () => {
    const previous = new Subject<Season[]>();
    const api = TestBed.inject(SeasonApiService);
    spyOn(api, 'getSeasonOfFantasy').and.returnValue(previous);
    spyOn(api, 'getSeasonByDriverName').and.returnValue(of([new Season(2, 'Two', 2)]));
    const fixture = TestBed.createComponent(SelectSeasonsComponent);
    fixture.componentRef.setInput('fantasy', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('driverName', 'Driver');
    fixture.detectChanges();
    previous.next([new Season(1, 'Obsolete', 1)]);
    expect(fixture.componentInstance.seasons().some(s => s.name === 'Obsolete')).toBeFalse();
  });

  it('clears comparison data and hides details on type or season changes', () => {
    const fixture = TestBed.createComponent(ComparativeStatsComponent);
    const component = fixture.componentInstance as any;
    component.driversInfoState.set([{ driver: driverPointsFixture.driver }, { driver: driverPointsFixture.driver }]);
    fixture.componentRef.setInput('typeSelected', 'Equipos');
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(component.driversInfo).toEqual([]);
    component.teamsInfoState.set([{}, {}]);
    component.ngOnChanges({ seasonSelected: new SimpleChange(null, new Season(1, 'One', 1), false) });
    expect(component.teamsInfo).toEqual([]);
    expect(component.comparisonChartData).toBeUndefined();
  });

  it('uses the requested historical season for participant fallbacks', () => {
    const fixture = TestBed.createComponent(DriversGridTableComponent);
    const component = fixture.componentInstance as any;
    const drivers = spyOn(TestBed.inject(DriverApiService), 'getAllDrivers').and.returnValue(of([]));
    const teams = spyOn(TestBed.inject(TeamApiService), 'getAllTeams').and.returnValue(of([]));
    const season = new Season(1, 'One', 1);
    component._updateDriversPointsData([], season);
    component._updateTeamsPointsData([], season);
    expect(drivers).toHaveBeenCalledWith(1);
    expect(teams).toHaveBeenCalledWith(1);
  });

  it('keeps spaces as underscores in team links', () => {
    const component = TestBed.createComponent(HomeTeamsComponent).componentInstance as any;
    expect(component.teamNameSpaceToUnderScore('Aston Martin')).toBe('Aston_Martin');
  });

  it('does not emit a fake successful value when handling an error without fallback', () => {
    const next = jasmine.createSpy('next');
    TestBed.inject(UtilsService).handleError('failure', 'test').subscribe(next);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not map missing driver information or select a race after HTTP errors', () => {
    spyOn(TestBed.inject(DriverApiService), 'getInfoByDriverName').and.returnValue(throwError(() => 'offline'));
    const driver = TestBed.createComponent(DriversInfoComponent).componentInstance as any;
    const mapStats = spyOn(driver, '_mapDriverStats');
    driver.onSeasonChange(new Season(1, 'One', 1));
    expect(mapStats).not.toHaveBeenCalled();
    expect(driver.driverInfo()).toBeUndefined();

    spyOn(TestBed.inject(RaceApiService), 'getAllRaces').and.returnValue(throwError(() => 'offline'));
    spyOn(TestBed.inject(RaceApiService), 'getAllRacesFinishedAndActual').and.returnValue(throwError(() => 'offline'));
    const races = TestBed.createComponent(SelectRacesComponent).componentInstance;
    const selection = spyOn(races.raceChanged, 'emit');
    races.obtainAllRaces();
    races.racesFinishedAndActual();
    expect(races.races()).toEqual([]);
    expect(selection).not.toHaveBeenCalled();
  });

  it('renders native driver and team links with reserved lazy images', () => {
    const driver = TestBed.createComponent(DriverCardComponent);
    driver.componentRef.setInput('driverPoint', driverPointsFixture);
    driver.componentRef.setInput('index', 1);
    driver.detectChanges();
    const link = driver.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toContain('/drivers/Piloto_de_prueba');
    const image = link.querySelector('img');
    expect(image.loading).toBe('lazy');
    expect(image.getAttribute('width')).toBeTruthy();
    expect(image.getAttribute('height')).toBeTruthy();

    spyOn(TestBed.inject(TeamApiService), 'getAllTeams').and.returnValue(of([{ ...driverPointsFixture.driver.team, name: 'Aston Martin' }]));
    const team = TestBed.createComponent(HomeTeamsComponent);
    team.detectChanges();
    expect(team.nativeElement.querySelector('a').getAttribute('href')).toBe('/teams/Aston_Martin');
    expect(team.nativeElement.querySelector('img').loading).toBe('lazy');
  });

  it('labels login fields and opens recovery with a native button', () => {
    const fixture = TestBed.createComponent(FantasyLoginComponent);
    fixture.detectChanges();
    for (const field of ['username', 'password']) {
      const input = fixture.nativeElement.querySelector(`[formControlName="${field}"]`);
      expect(fixture.nativeElement.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
      expect(input.getAttribute('aria-describedby')).toBeTruthy();
      expect(input.getAttribute('aria-invalid')).toBe('true');
    }
    const recovery = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button: any) => button.textContent.includes('Recuperar')) as HTMLButtonElement;
    recovery.click();
    expect((fixture.componentInstance as any).recoveryPasswordDialog()).toBeTrue();
    expect(fixture.nativeElement.querySelector('[onkeydown]')).toBeNull();
  });

  it('shows empty races and an error with a working retry', async () => {
    const api = TestBed.inject(RaceApiService);
    spyOn(api, 'getAllRaces').and.returnValue(of([]));
    const fixture = TestBed.createComponent(RacesComponent);
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 150));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No hay carreras');
    api.getAllRaces = jasmine.createSpy().and.returnValue(throwError(() => new Error('offline')));
    (fixture.componentInstance as any).retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar');
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  it('finishes the home driver empty state and supports retry after failure', () => {
    spyOn(TestBed.inject(ResultApiService), 'getAllDriverPoints').and.returnValue(of([]));
    spyOn(TestBed.inject(DriverApiService), 'getAllDrivers').and.returnValue(of([]));
    const fixture = TestBed.createComponent(HomeDriversComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No hay pilotos');
    TestBed.inject(ResultApiService).getAllDriverPoints = jasmine.createSpy().and.returnValue(throwError(() => new Error('offline')));
    (fixture.componentInstance as any).retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar');
  });

  it('renders a single home driver without inserting undefined podium entries', () => {
    spyOn(TestBed.inject(ResultApiService), 'getAllDriverPoints').and.returnValue(of([]));
    spyOn(TestBed.inject(DriverApiService), 'getAllDrivers').and.returnValue(of([driverPointsFixture.driver]));
    const fixture = TestBed.createComponent(HomeDriversComponent);
    fixture.detectChanges();
    expect((fixture.componentInstance as any).top3Drivers).toEqual([driverPointsFixture.driver]);
  });

  it('executes logout from the footer and uses the statistics route', () => {
    const component = TestBed.createComponent(FooterComponent).componentInstance as any;
    spyOn(TestBed.inject(AuthJWTService), 'isLogged').and.returnValue(true);
    const logout = spyOn(TestBed.inject(AuthJWTService), 'logOut');
    component.isFantasy.set(true);
    component.putItemsHeader();
    component.navigationRouters().find((item: any) => item.command)?.command({});
    expect(logout).toHaveBeenCalledTimes(1);
    component.isFantasy.set(false);
    component.putItemsHeader();
    expect(component.informationRouters().some((item: any) => item.routerLink === '/statistics')).toBeTrue();
  });

  it('keeps a historical Fantasy race when the theme changes and disables saving', () => {
    const fixture = TestBed.createComponent(FantasyTeamComponent);
    const component = fixture.componentInstance as any;
    spyOn(component, 'getDriversTeamPrices');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.match(r => r.url.endsWith('/races/actual')).forEach(r => r.flush({ id: 3 }));
    fixture.detectChanges();
    component.raceSelected = { id: 1 };
    const theme = TestBed.inject(ThemeService);
    theme.toggleTheme();
    fixture.detectChanges();
    expect(component.raceSelected.id).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('no está habilitada');
    const save = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button: any) => button.textContent.includes('Guardar equipo')) as HTMLButtonElement;
    expect(save.disabled).toBeTrue();
  });
});
