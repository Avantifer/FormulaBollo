import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Params, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { provideComponentTesting, driverPointsFixture } from '../../../testing/component-test-providers';
import { SeasonApiService } from '../../../shared/services/api/season-api.service';
import { TeamApiService } from '../../../shared/services/api/team-api.service';
import { ResultApiService } from '../../../shared/services/api/result-api.service';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { DriversRankingComponent } from './drivers-ranking/drivers-ranking.component';
import { DriversComponent } from './drivers.component';

describe('DriversComponent', () => {
  let fixture: ComponentFixture<DriversComponent>;
  let navigate: jasmine.Spy;
  const team = driverPointsFixture.driver.team;
  const season = driverPointsFixture.driver.season;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DriversComponent], providers: provideComponentTesting() });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(TestBed.inject(SeasonApiService), 'getSeasons').and.returnValue(of([season, environment.seasonActual]));
    spyOn(TestBed.inject(TeamApiService), 'getAllTeams').and.returnValue(of(Array.from({ length: 12 }, (_, id) => ({ ...team, id, name: id === 0 ? 'Ferrari' : 'Equipo ' + id }))));
    spyOn(TestBed.inject(ResultApiService), 'getAllDriverPoints').and.returnValue(of([
      { ...driverPointsFixture, totalPoints: 200 },
      { ...driverPointsFixture, driver: { ...driverPointsFixture.driver, id: 2, name: 'Nombre de piloto largo', number: 111 }, totalPoints: 135 }
    ]));
    fixture = TestBed.createComponent(DriversComponent);
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
    fixture = TestBed.createComponent(DriversComponent);
  }

  function select(): SelectSeasonsComponent {
    return fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance;
  }

  function ranking(): DriversRankingComponent {
    return fixture.debugElement.query(By.directive(DriversRankingComponent)).componentInstance;
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
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Clasificación de pilotos');
    expect(fixture.nativeElement.querySelector('h2.sr-only').textContent).toBe('Pilotos');
    expect(fixture.nativeElement.querySelector('p-select, p-selectbutton, p-divider, drivers-teams-grid-table')).toBeNull();
    expect(select().variant()).toBe('tabs');
    expect(Array.from(fixture.nativeElement.querySelectorAll('select-seasons button'), (button: any) => button.textContent.trim())).toEqual(['T1 (Temporada 1)', 'T3 (Temporada 3)']);
    expect(fixture.nativeElement.querySelector('.team-logos')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('ol li').length).toBe(2);
  });

  it('propagates team selection and clears it through the filter when the season changes', async () => {
    await render();
    fixture.nativeElement.querySelector('button[aria-label="Ferrari"]').click();
    fixture.detectChanges();
    const ranking = fixture.debugElement.query(By.directive(DriversRankingComponent)).componentInstance as DriversRankingComponent;
    expect(ranking.selectedTeams()).toEqual(['Ferrari']);
    const select = fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
    select.seasonChanged.emit({ ...season, number: 2 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(ranking.season().number).toBe(2);
    expect(ranking.selectedTeams()).toEqual(['Todos los equipos']);
  });

  it('measures layout, touch targets and theme contrast in iframes from 320 to 1920px', async () => {
    await render();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');

    function luminance(color: string): number {
      const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    function contrast(a: string, b: string): number {
      const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (values[0] + 0.05) / (values[1] + 0.05);
    }

    for (const dark of [false, true]) {
      for (const width of [320, 360, 375, 390, 480, 640, 767, 768, 1023, 1024, 1440, 1920]) {
        const frame = document.createElement('iframe');
        frame.style.width = width + 'px';
        frame.style.height = '900px';
        frame.style.border = '0';
        document.body.append(frame);
        try {
          const doc = frame.contentDocument!;
          doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + fixture.nativeElement.outerHTML + '</body>';
          doc.documentElement.classList.toggle('dark', dark);
          const view = frame.contentWindow!;
          const context = (dark ? 'dark' : 'light') + '/' + width;
          expect(doc.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(width);
          const panel = doc.querySelector('section')!;
          const panelStyle = view.getComputedStyle(panel);
          const row = doc.querySelector<HTMLElement>('.ranking-row')!;
          const rowStyle = view.getComputedStyle(row);
          expect(contrast(rowStyle.color, rowStyle.backgroundColor)).withContext(context + '/ink').toBeGreaterThanOrEqual(4.5);
          const teamName = row.querySelector('.driver-identity p')!;
          expect(contrast(view.getComputedStyle(teamName).color, rowStyle.backgroundColor)).withContext(context + '/soft').toBeGreaterThanOrEqual(4.5);
          const position = row.querySelector('.rank-position')!;
          expect(contrast(view.getComputedStyle(position).color, rowStyle.backgroundColor)).withContext(context + '/podium').toBeGreaterThanOrEqual(4.5);
          for (const podium of [1, 2, 3]) {
            position.className = 'rank-position text-podium-' + podium;
            const token = doc.createElement('span');
            token.style.color = 'var(--podium-' + podium + ')';
            row.append(token);
            expect(view.getComputedStyle(position).color).withContext(context + '/podium token').toBe(view.getComputedStyle(token).color);
            expect(view.getComputedStyle(position).color).not.toBe(rowStyle.color);
            token.remove();
            for (const background of [panelStyle.backgroundColor, rowStyle.backgroundColor]) {
              expect(contrast(view.getComputedStyle(position).color, background)).withContext(context + '/podium-' + podium).toBeGreaterThanOrEqual(4.5);
            }
          }
          position.className = 'rank-position';
          expect(view.getComputedStyle(position).color).toBe(rowStyle.color);
          const points = Array.from(doc.querySelectorAll('.points-score strong'), number => number.getBoundingClientRect());
          expect(Math.abs(points[0].right - points[1].right)).withContext(context + '/points aligned').toBeLessThanOrEqual(0.5);
          expect(panelStyle.backgroundColor).toBe(dark ? 'rgb(29, 33, 39)' : 'rgb(255, 255, 255)');
          for (const badge of Array.from(doc.querySelectorAll('.team-badge, .team-filter-logo'))) {
            expect(view.getComputedStyle(badge).backgroundColor).withContext(context).toBe('rgb(233, 236, 239)');
            expect(view.getComputedStyle(badge).borderTopWidth).withContext(context + '/badge border').toBe('1px');
          }
          const tabs = doc.querySelector<HTMLElement>('select-seasons [role="group"]')!;
          const title = doc.querySelector('h1')!.getBoundingClientRect();
          const tabsRect = tabs.getBoundingClientRect();
          if (width < 768) {
            expect(tabsRect.top).withContext(context + '/tabs below title').toBeGreaterThanOrEqual(title.bottom);
          } else {
            expect(tabsRect.left).withContext(context + '/tabs right of title').toBeGreaterThanOrEqual(title.right);
          }
          // Many seasons must scroll inside the control without widening the page.
          for (let index = 0; index < 20; index++) tabs.append(tabs.firstElementChild!.cloneNode(true));
          expect(tabs.scrollWidth).withContext(context + '/tabs scroll').toBeGreaterThan(tabs.clientWidth);
          expect(doc.documentElement.scrollWidth).withContext(context + '/tabs overflow').toBeLessThanOrEqual(width);
          while (tabs.children.length > 2) tabs.lastElementChild!.remove();
          const profile = doc.querySelector<HTMLElement>(width < 768 ? '.profile-mobile' : '.profile-desktop')!;
          expect(view.getComputedStyle(profile).display).withContext(context).not.toBe('none');
          if (width >= 768) {
            const indicator = profile.querySelector<HTMLElement>('.profile-indicator')!;
            expect(indicator.getBoundingClientRect().width).toBe(36);
            expect(indicator.getBoundingClientRect().height).toBe(36);
            expect(profile.textContent!.trim()).toBe('');
            expect(profile.getBoundingClientRect().left).toBeGreaterThanOrEqual(row.querySelector('.position-change')!.getBoundingClientRect().right);
          }
          const rowRect = row.getBoundingClientRect();
          expect(rowRect.height).withContext(context + '/row target').toBeGreaterThanOrEqual(52);
          const link = row.querySelector<HTMLAnchorElement>('a')!;
          const overlay = view.getComputedStyle(link, '::after');
          expect(overlay.position).withContext(context + '/stretched').toBe('absolute');
          expect(parseFloat(overlay.width)).withContext(context + '/stretched width').toBeCloseTo(row.clientWidth, 0);
          expect(parseFloat(overlay.height)).withContext(context + '/stretched height').toBeCloseTo(row.clientHeight, 0);
          expect(doc.elementFromPoint(rowRect.right - 4, rowRect.top + 4)).withContext(context + '/row hit target').toBe(link);
          link.focus();
          expect(view.getComputedStyle(row).outlineStyle).withContext(context + '/focus').toBe('solid');
          const nameRect = row.querySelector('.driver-identity')!.getBoundingClientRect();
          const numberRect = row.querySelector('.driver-number')!.getBoundingClientRect();
          expect(nameRect.width).withContext(context).toBeGreaterThan(0);
          if (width >= 768) {
            expect(nameRect.right).withContext(context).toBeLessThanOrEqual(numberRect.left);
          } else {
            expect(numberRect.top).withContext(context).toBeGreaterThanOrEqual(nameRect.bottom);
          }
          expect(rowRect.right).withContext(context).toBeLessThanOrEqual(panel.getBoundingClientRect().right);
          if (width < 768) {
            for (const target of Array.from(doc.querySelectorAll<HTMLElement>('.team-logos button, select-seasons button'))) {
              const rect = target.getBoundingClientRect();
              expect(rect.width).withContext(context).toBeGreaterThanOrEqual(44);
              expect(rect.height).withContext(context).toBeGreaterThanOrEqual(44);
            }
            const bar = row.querySelector('.points-track')!.getBoundingClientRect();
            expect(bar.top).withContext(context).toBeGreaterThanOrEqual(nameRect.bottom);
            expect(doc.querySelector<HTMLElement>('.team-logos')!.scrollWidth).toBeGreaterThan(doc.querySelector<HTMLElement>('.team-logos')!.clientWidth);
          } else {
            expect(rowRect.height).withContext(context).toBeCloseTo(52, 0);
          }
          console.info('DRIVERS_LAYOUT', context, 'rowHeight=' + rowRect.height, 'scrollWidth=' + doc.documentElement.scrollWidth);
        } finally { frame.remove(); }
      }
    }
  });
});

@Component({ template: '<h1>Perfil de prueba</h1>' })
class ProfileStubComponent {}

describe('Drivers route history', () => {
  it('encodes team names, preserves other params and restores the filtered season after profile/back', async () => {
    TestBed.configureTestingModule({
      imports: [DriversComponent, ProfileStubComponent],
      providers: [
        ...provideComponentTesting(),
        provideLocationMocks(),
        provideRouter([
          { path: 'drivers', component: DriversComponent },
          { path: 'drivers/:name', component: ProfileStubComponent }
        ]),
        { provide: ActivatedRoute, useFactory: () => TestBed.inject(Router).routerState.root }
      ]
    });
    const historical = driverPointsFixture.driver.season;
    const redBull = { ...driverPointsFixture.driver.team, id: 2, name: 'Red Bull' };
    spyOn(TestBed.inject(SeasonApiService), 'getSeasons').and.returnValue(of([historical, environment.seasonActual]));
    spyOn(TestBed.inject(TeamApiService), 'getAllTeams').and.returnValue(of([driverPointsFixture.driver.team, redBull]));
    spyOn(TestBed.inject(ResultApiService), 'getAllDriverPoints').and.returnValue(of([
      driverPointsFixture,
      { ...driverPointsFixture, driver: { ...driverPointsFixture.driver, id: 2, name: 'Segundo piloto', team: redBull } }
    ]));

    const harness = await RouterTestingHarness.create('/drivers?season=1&teams=Red%20Bull&extra=keep');
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
    expect(link.getAttribute('href')).toBe('/drivers/Segundo_piloto?season=1');
    link.click();
    await settle();
    expect(router.url).toBe('/drivers/Segundo_piloto?season=1');
    expect(harness.routeNativeElement!.textContent).toContain('Perfil de prueba');

    TestBed.inject(Location).back();
    await settle();
    expect(router.url).toBe(filteredUrl);
    expect(harness.routeDebugElement!.componentInstance).not.toBe(original);
    expect(harness.routeNativeElement!.querySelectorAll('ol a')).toHaveSize(1);
    expect(harness.routeNativeElement!.querySelector('ol a')?.getAttribute('href')).toBe('/drivers/Segundo_piloto?season=1');
    expect(harness.routeNativeElement!.querySelector('button[aria-label="Red Bull"]')?.getAttribute('aria-pressed')).toBe('true');
    const select = harness.routeDebugElement!.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
    expect(select.seasonForm.get('season')!.value.number).toBe(1);
  });
});
