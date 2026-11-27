import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting, driverPointsFixture } from '../../../../testing/component-test-providers';
import { DriverInfo } from '../../../../shared/models/driverInfo';
import { DriversInfoComponent } from './drivers-info.component';
import { ImageService } from '../../../../shared/services/image.service';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { By, Title } from '@angular/platform-browser';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { Season } from '../../../../shared/models/season';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { SeasonApiService } from '../../../../shared/services/api/season-api.service';
import { SelectSeasonsComponent } from '../../../../shared/components/select-seasons/select-seasons.component';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { DriverTeamHistoryEntry } from '../../../../shared/models/driverTeamHistoryEntry';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { CacheService } from '../../../../shared/services/cache.service';
import { HttpTestingController } from '@angular/common/http/testing';

describe('DriversInfoComponent', () => {
  let component: DriversInfoComponent;
  let fixture: ComponentFixture<DriversInfoComponent>;
  const info: DriverInfo = {
    driver: driverPointsFixture.driver,
    totalPoints: 336, victories: 6, podiums: 15, poles: 9,
    fastlaps: 4, averagePosition: 2.416, racesFinished: 17,
    penalties: 0, bestPosition: 1, championships: 2,
    last5Results: [1, 2, 3, 4, 5].map((position, index) => ({
      race: {
        id: position, name: index === 0 ? '  Marina Bay  ' : 'Carrera de prueba ' + position,
        flagImage: 'flag.png', circuitImage: 'circuit.png',
        dateStart: new Date('2026-01-01T12:00:00Z'), season: driverPointsFixture.driver.season, finished: 1
      },
      driver: driverPointsFixture.driver,
      position: { id: position, positionNumber: position, points: [8, 25, 25, 18, 18][index] },
      fastlap: index % 2, pole: 1 - index % 2
    })) as DriverInfo['last5Results']
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriversInfoComponent], providers: provideComponentTesting()
    }).compileComponents();
    // Real data URLs keep image load errors deterministic in DOM/layout tests.
    TestBed.inject(ImageService).getImageUrl = () =>
      'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="gray"/></svg>');
    fixture = TestBed.createComponent(DriversInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function render(value = info): void {
    component['driverInfo'].set(value);
    component['_mapDriverStats'](value);
    fixture.detectChanges();
  }

  it('should create with one loading h1 and reserved profile space', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    expect(fixture.nativeElement.querySelector('h1').classList.contains('sr-only')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.loading-profile')).not.toBeNull();
  });

  it('renders the team hero, one h1 with name and number, and decorative images', () => {
    render({ ...info, driver: { ...info.driver, team: { ...info.driver.team, name: 'Aston Martin' } } });
    const hero: HTMLElement = fixture.nativeElement.querySelector('header');
    expect(hero.classList.contains('bg-Aston_Martin')).toBeTrue();
    expect(hero.classList.contains('on-Aston_Martin')).toBeTrue();
    expect(hero.textContent).toContain('Aston Martin');
    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain(info.driver.name);
    expect(headings[0].textContent).toContain(String(info.driver.number));
    expect(headings[0].classList.contains('sr-only')).toBeFalse();
    expect(hero.querySelector('.hero-number')?.getAttribute('aria-hidden')).toBe('true');
    expect(hero.querySelector('.hero-photo')?.getAttribute('alt')).toBe('');
    expect(hero.querySelector('.team-badge')?.getAttribute('alt')).toBe('');
    expect(fixture.nativeElement.querySelector('main')).toBeNull();
    for (const icon of Array.from(fixture.nativeElement.querySelectorAll('i')) as HTMLElement[]) {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('preserves the hero when the photo is missing or fails to load', () => {
    render({ ...info, driver: { ...info.driver, driverImage: '' } });
    expect(fixture.nativeElement.querySelector('.hero-photo')).toBeNull();
    render();
    fixture.nativeElement.querySelector('.hero-photo').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-photo')).toBeNull();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain(info.driver.name);
    expect(fixture.nativeElement.querySelector('header').classList.contains('bg-Ferrari')).toBeTrue();
  });

  it('uses a light circle only for the default silhouette and borders team badges in both themes', () => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    try {
      for (const dark of [false, true]) {
        root.classList.toggle('dark', dark);
        render({ ...info, driver: { ...info.driver, driverImage: 'drivers/default/default.webp' } });
        const silhouette = fixture.nativeElement.querySelector('.hero-photo') as HTMLElement;
        expect(silhouette.classList.contains('default-driver-photo')).toBeTrue();
        expect(getComputedStyle(silhouette).backgroundColor).toBe('rgb(233, 236, 239)');
        expect(getComputedStyle(silhouette).borderRadius).toBe('50%');
        const badge = fixture.nativeElement.querySelector('.team-badge') as HTMLElement;
        expect(getComputedStyle(badge).borderTopWidth).toBe('1px');
        expect(badge.getBoundingClientRect().width).toBe(32);
        expect(badge.getBoundingClientRect().height).toBe(32);
        render();
        expect(fixture.nativeElement.querySelector('.hero-photo.default-driver-photo')).toBeNull();
      }
    } finally { root.classList.toggle('dark', wasDark); }
  });

  it('updates the title when selecting a season or Total', () => {
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component['onSeasonChange'](new Season(3, 'Temporada', 3));
    expect(TestBed.inject(Title).getTitle()).toBe('Piloto de prueba · Temporada 3 · FormulaBollo');
    component['onSeasonChange'](new Season(0, 'Total', 0));
    expect(TestBed.inject(Title).getTitle()).toBe('Piloto de prueba · Total · FormulaBollo');
  });

  it('renders four key and six secondary statistics with their labels and formatted values', () => {
    render();
    const groups = [
      { selector: '.key-stats', labels: ['Puntos Totales', 'Victorias', 'Podios', 'Poles'], values: ['336', '6', '15', '9'] },
      { selector: '.secondary-stats', labels: ['Vueltas Rápidas', 'Posición Media', 'Carreras Terminadas', 'Penalizaciones', 'Mejor posición', 'Campeonatos'], values: ['4', '2,42', '17', '0', '1', '2'] }
    ];
    for (const group of groups) {
      const stats = fixture.nativeElement.querySelector(group.selector).querySelectorAll('.stat') as NodeListOf<HTMLElement>;
      expect(stats.length).toBe(group.labels.length);
      stats.forEach((stat, index) => {
        expect(stat.querySelector('dt')?.textContent?.trim()).toBe(group.labels[index]);
        expect(stat.querySelector('dd')?.textContent?.trim()).toBe(group.values[index]);
        expect(stat.querySelector('dd')?.classList.contains('tabular-nums')).toBeTrue();
        expect(stat.querySelector('i.pi')).not.toBeNull();
      });
    }
    expect(fixture.nativeElement.querySelector('.points-bar').classList.contains('bg-Ferrari')).toBeTrue();
  });

  it('renders five semantic timeline rows with flags, dates, explicit statuses, podiums and native results links', () => {
    render();
    expect(fixture.nativeElement.querySelector('p-table')).toBeNull();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Últimas 5 carreras');
    expect(fixture.nativeElement.textContent).toContain('Solo se muestran carreras principales, no incluye carreras sprint');
    const rows = fixture.nativeElement.querySelectorAll('ol > .race-row') as NodeListOf<HTMLElement>;
    expect(rows.length).toBe(5);
    rows.forEach((row, index) => {
      const result = info.last5Results[index];
      expect(row.querySelector('h3')?.textContent).toBe(result.race.name.trim());
      expect(row.querySelector('time')?.textContent).toBe('01/01/2026');
      expect(row.querySelector('time')?.getAttribute('datetime')).toBe('2026-01-01');
      const flag = row.querySelector('img')!;
      expect(flag.loading).toBe('lazy');
      expect(flag.getAttribute('width')).toBe('32');
      expect(flag.getAttribute('height')).toBe('20');
      const marks = row.querySelectorAll('.race-marks > span');
      expect(marks[0].textContent).toBe('Pole ' + (index % 2 ? 'No' : 'Sí'));
      expect(marks[1].textContent).toBe('Vuelta Rápida ' + (index % 2 ? 'Sí' : 'No'));
      expect(marks[0].classList.contains('text-sector-up')).toBe(index % 2 === 0);
      const badge = row.querySelector('.position')!;
      expect(badge.textContent?.trim()).toBe('Posición ' + (index + 1));
      for (const podium of [1, 2, 3]) {
        expect(badge.classList.contains('text-podium-' + podium)).toBe(index + 1 === podium);
      }
      expect(badge.classList.contains('bg-accent')).toBeFalse();
      expect(row.querySelector('.race-points')?.textContent).toBe('Puntos +' + ((result.position?.points ?? 0) + (result.fastlap ?? 0)));
      expect(row.querySelector('.timeline-dot')?.classList.contains('bg-Ferrari')).toBeTrue();
      const link = row.querySelector<HTMLAnchorElement>('a.results-link')!;
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBe('/results/' + result.race.name.replaceAll(' ', '_') + '/1');
      expect(link.textContent).toContain('Resultados');
    });
  });

  for (const testCase of [
    { position: { id: 1, positionNumber: 1, points: 25 }, fastlap: 1, expected: '+26' },
    { position: { id: 1, positionNumber: 1, points: 25 }, fastlap: 0, expected: '+25' },
    { position: { id: 6, positionNumber: 6, points: 8 }, fastlap: 1, expected: '+9' },
    { position: null, fastlap: 1, expected: '+1' },
    { position: { id: 1, positionNumber: 1, points: null! }, fastlap: 1, expected: '+1' },
    { position: { id: 1, positionNumber: 1, points: 25 }, fastlap: null!, expected: '+25' }
  ]) {
    it('renders race points ' + JSON.stringify(testCase), () => {
      render({ ...info, last5Results: [{ ...info.last5Results[0], position: testCase.position, fastlap: testCase.fastlap }] });
      const points: HTMLElement = fixture.nativeElement.querySelector('.race-points');
      expect(points.textContent).toBe('Puntos ' + testCase.expected);
      expect(points.querySelector('.sr-only')?.textContent).toBe('Puntos ');
    });
  }

  it('renders the current empty results message without a timeline', () => {
    render({ ...info, last5Results: [] as unknown as DriverInfo['last5Results'] });
    expect(fixture.nativeElement.querySelector('ol')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No hay resultados disponibles');
  });

  it('checks responsive layout, touch targets, focus and contrast for all twelve teams in both themes', async () => {
    spyOn(TestBed.inject(DriverApiService), 'getInfoByDriverName').and.returnValue(of(info));
    spyOn(TestBed.inject(ResultApiService), 'getAllDriverPoints').and.returnValue(of([driverPointsFixture]));
    spyOn(TestBed.inject(DriverApiService), 'getTeamHistoryByDriverName').and.returnValue(of(
      ['Williams', 'McLaren', 'Aston Martin', 'Kick Sauber', 'Williams'].map((name, index) => ({
        season: new Season(index + 1, 'Temporada', index + 1), team: { ...info.driver.team, name }
      }))
    ));
    for (const total of [false, true]) {
      component['onSeasonChange'](new Season(total ? 0 : 1, 'Temporada', total ? 0 : 1));
      render({ ...info, driver: { ...info.driver, name: 'UnNombreDePilotoMuyLargoSinEspacios' } });
      const selector = fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
      selector.seasons.set([new Season(0, 'Total', 0), ...Array.from({ length: 20 }, (_, i) => new Season(i + 1, 'Temporada', i + 1))]);
      fixture.detectChanges();
      await fixture.whenStable();
      const styles = Array.from(document.styleSheets).flatMap(sheet => {
        try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
        catch { return []; }
      }).join('\n');
      function luminance(color: string): number {
        const c = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => {
          const n = v / 255;
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        });
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      }
      function contrast(a: string, b: string): number {
        const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (values[0] + 0.05) / (values[1] + 0.05);
      }
      for (const dark of [false, true]) {
        for (const width of [320, 390, 640, 768, 1024, 1440, 1920]) {
          const frame = document.createElement('iframe');
          Object.assign(frame.style, { width: width + 'px', height: '1200px', border: '0' });
          document.body.append(frame);
          try {
            const doc = frame.contentDocument!;
            doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + fixture.nativeElement.outerHTML + '</body>';
            doc.documentElement.classList.toggle('dark', dark);
            const view = frame.contentWindow!;
            const context = (total ? 'total/' : 'season/') + (dark ? 'dark' : 'light') + '/' + width;
            expect(doc.querySelectorAll('.team-link').length).toBe(total ? 5 : 1);
            expect(doc.querySelectorAll('.classification-stat').length).toBe(total ? 0 : 1);
            const cells = Array.from(doc.querySelectorAll<HTMLElement>('.key-stats > .stat'));
            const bars = doc.querySelectorAll<HTMLElement>('.key-stats .points-bar');
            expect(bars.length).withContext(context + '/single decorative bar').toBe(1);
            expect(bars[0].parentElement).withContext(context + '/first cell owns bar').toBe(cells[0]);
            expect(bars[0].getAttribute('aria-hidden')).toBe('true');
            expect(bars[0].getBoundingClientRect().width).withContext(context + '/bar width').toBe(3);
            expect(bars[0].getBoundingClientRect().left).withContext(context + '/bar at left edge')
              .toBe(cells[0].getBoundingClientRect().left);
            expect(view.getComputedStyle(bars[0]).backgroundColor).toBe(view.getComputedStyle(doc.querySelector('header')!).backgroundColor);
            cells.forEach((cell, index) => {
              expect(cell.querySelectorAll('.points-bar').length).withContext(context + '/cell ' + index).toBe(index === 0 ? 1 : 0);
              expect(cell.querySelector('dt')!.getBoundingClientRect().left - cell.getBoundingClientRect().left)
                .withContext(context + '/unchanged content inset').toBe(width < 640 ? 16 : 24);
            });
            if (!total) {
              expect(cells[1].querySelector('dt')!.textContent).toBe('Puntos Totales');
              expect(cells[1].querySelector('.points-bar')).toBeNull();
              if (width < 768) {
                expect(cells[0].getBoundingClientRect().width).toBe(doc.querySelector('.key-stats')!.getBoundingClientRect().width);
              }
            }
            expect(doc.querySelector('header .ranking-badge')).toBeNull();
            const rows = Array.from(doc.querySelectorAll<HTMLElement>('.race-row'));
            expect(rows.length).withContext(context).toBe(5);
            const line = doc.querySelector<HTMLElement>('.timeline-rule')!;
            const lineRect = line.getBoundingClientRect();
            const lineStyle = view.getComputedStyle(line);
            const canvasBackground = view.getComputedStyle(doc.querySelector('.bg-canvas')!).backgroundColor;
            expect(lineRect.width).withContext(context + '/timeline line width').toBe(1);
            for (const row of rows) {
              const dot = row.querySelector<HTMLElement>('.timeline-dot')!;
              const dotRect = dot.getBoundingClientRect();
              const dotStyle = view.getComputedStyle(dot);
              expect(Math.abs(dotRect.left + dotRect.width / 2 - (lineRect.left + lineRect.width / 2)))
                .withContext(context + '/timeline centers').toBeLessThanOrEqual(0.5);
              expect(dotRect.width).withContext(context + '/visible dot size').toBe(10);
              expect(dotRect.height).withContext(context + '/visible dot size').toBe(10);
              expect(Number(dotStyle.zIndex)).withContext(context + '/dot above line').toBeGreaterThan(Number(lineStyle.zIndex));
              expect(dotStyle.boxShadow).withContext(context + '/canvas ring of 2px')
                .toBe(canvasBackground + ' 0px 0px 0px 2px');
            }
            expect(rows[0].querySelector('.race-points')!.textContent).toBe('Puntos +8');
            expect(rows[1].querySelector('.race-points')!.textContent).toBe('Puntos +26');
            for (const points of [[8, 26, 25, 19, 18], [1, 99, 8, 26, 18]]) {
              rows.forEach((row, index) => {
                row.querySelector('.race-points')!.lastChild!.textContent = '+' + points[index];
              });
              const firstPosition = rows[0].querySelector('.position')!.getBoundingClientRect();
              const firstPoints = rows[0].querySelector('.race-points')!.getBoundingClientRect();
              const firstLink = rows[0].querySelector('.results-link')!.getBoundingClientRect();
              expect(firstPosition.width).withContext(context).toBeGreaterThan(0);
              for (const row of rows) {
                const position = row.querySelector('.position')!.getBoundingClientRect();
                const score = row.querySelector('.race-points')!.getBoundingClientRect();
                const link = row.querySelector('.results-link')!.getBoundingClientRect();
                expect(Math.abs(position.left - firstPosition.left)).withContext(context + '/position left').toBeLessThanOrEqual(0.5);
                expect(Math.abs(score.right - firstPoints.right)).withContext(context + '/points right').toBeLessThanOrEqual(0.5);
                expect(Math.abs(link.left - firstLink.left)).withContext(context + '/results left').toBeLessThanOrEqual(0.5);
                expect(Math.abs(link.right - firstLink.right)).withContext(context + '/results right').toBeLessThanOrEqual(0.5);
                const pointsElement = row.querySelector<HTMLElement>('.race-points')!;
                expect(pointsElement.scrollWidth).withContext(context + '/points overflow').toBeLessThanOrEqual(pointsElement.clientWidth);
                expect(view.getComputedStyle(pointsElement).fontVariantNumeric).toBe('tabular-nums');
                expect(view.getComputedStyle(pointsElement).textAlign).toBe('right');
              }
            }
            expect(doc.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(width);
            const name = doc.querySelector<HTMLElement>('.driver-name')!;
            expect(name.scrollWidth).withContext(context + '/name').toBeLessThanOrEqual(name.clientWidth);
            expect(name.getBoundingClientRect().right).withContext(context).toBeLessThanOrEqual(doc.querySelector('header')!.getBoundingClientRect().right);
            for (const target of Array.from(doc.querySelectorAll<HTMLElement>('button, a'))) {
              const rect = target.getBoundingClientRect();
              expect(rect.height).withContext(context + '/target height').toBeGreaterThanOrEqual(44);
              expect(rect.width).withContext(context + '/target width').toBeGreaterThanOrEqual(44);
              target.focus();
              expect(view.getComputedStyle(target).outlineStyle).withContext(context + '/focus').toBe('solid');
              if (target.classList.contains('team-link')) {
                expect(view.getComputedStyle(target).textDecorationLine).toContain('underline');
              }
            }
            const tabs = doc.querySelector<HTMLElement>('[role="group"]')!;
            expect(tabs.scrollWidth).toBeGreaterThan(tabs.clientWidth);
            const hero = doc.querySelector<HTMLElement>('header')!;
            const teams = ['Red_Bull', 'AlphaTauri', 'Ferrari', 'Mercedes', 'Aston_Martin', 'Williams', 'Haas', 'McLaren', 'Alfa_Romeo', 'Alpine', 'Kick_Sauber', 'RB'];
            expect(teams.length).toBe(12);
            for (const team of [...teams, 'Alfa_Romeo_Racing']) {
              hero.className = 'driver-hero bg-' + team + ' on-' + team;
              const background = view.getComputedStyle(hero).backgroundColor;
              for (const text of Array.from(hero.querySelectorAll('h1, .driver-name, .hero-identity p, .team-link'))) {
                expect(contrast(view.getComputedStyle(text).color, background)).withContext(context + '/' + team).toBeGreaterThanOrEqual(4.5);
              }
              for (const badge of Array.from(hero.querySelectorAll('.team-badge'))) {
                expect(view.getComputedStyle(badge).backgroundColor).toBe('rgb(233, 236, 239)');
              }
            }
            const panel = view.getComputedStyle(doc.querySelector('.driver-stats')!).backgroundColor;
            const classification = doc.querySelector<HTMLElement>('.classification-stat');
            if (classification) {
              const value = classification.querySelector<HTMLElement>('.classification-value')!;
              for (const podium of [1, 2, 3]) {
                value.className = 'classification-value text-podium-' + podium;
                expect(contrast(view.getComputedStyle(value).color, panel))
                  .withContext(context + '/classification podium ' + podium).toBeGreaterThanOrEqual(4.5);
              }
              const stats = Array.from(doc.querySelectorAll<HTMLElement>('.key-stats > .stat'));
              const rects = stats.map(stat => stat.getBoundingClientRect());
              expect(stats.length).toBe(5);
              expect(view.getComputedStyle(value).fontSize).toBe(view.getComputedStyle(stats[1].querySelector('dd')!).fontSize);
              expect(view.getComputedStyle(value).fontFamily).toBe(view.getComputedStyle(stats[1].querySelector('dd')!).fontFamily);
              expect(view.getComputedStyle(value).fontVariantNumeric).toBe('tabular-nums');
              if (width < 768) {
                expect(rects[0].width).toBeCloseTo(doc.querySelector('.key-stats')!.getBoundingClientRect().width, 0);
                expect(rects[1].top).toBe(rects[2].top);
                expect(rects[3].top).toBe(rects[4].top);
                expect(rects[1].top).toBeGreaterThan(rects[0].top);
                expect(rects[3].top).toBeGreaterThan(rects[1].top);
              } else {
                expect(rects.every(rect => rect.top === rects[0].top)).toBeTrue();
                rects.forEach(rect => expect(rect.width).toBeCloseTo(rects[0].width, 0));
              }
              stats.forEach(stat => expect(stat.scrollWidth).withContext(context + '/stat overflow').toBeLessThanOrEqual(stat.clientWidth));
            }
            for (const text of Array.from(doc.querySelectorAll('.driver-stats dt, .driver-stats dd, .position'))) {
              expect(contrast(view.getComputedStyle(text).color, panel)).withContext(context + '/statistics or podium').toBeGreaterThanOrEqual(4.5);
            }
            const canvas = view.getComputedStyle(doc.querySelector('.bg-canvas')!).backgroundColor;
            for (const text of Array.from(doc.querySelectorAll('.race-marks span, .race-points, time'))) {
              expect(contrast(view.getComputedStyle(text).color, canvas)).withContext(context + '/race text').toBeGreaterThanOrEqual(4.5);
            }
            const keyColumns = view.getComputedStyle(doc.querySelector('.key-stats')!).gridTemplateColumns.split(' ').length;
            const secondaryColumns = view.getComputedStyle(doc.querySelector('.secondary-stats')!).gridTemplateColumns.split(' ').length;
            expect(keyColumns).toBe(width < 768 ? 2 : total ? 4 : 5);
            expect(secondaryColumns).toBe(width < 768 ? 2 : 6);
            console.info('DRIVER_INFO_LAYOUT', context, 'scrollWidth=' + doc.documentElement.scrollWidth, 'teams=12+alias');
          } finally { frame.remove(); }
        }
      }
    }
  });
});

describe('Driver profile cache version regression', () => {
  let fixture: ComponentFixture<DriversInfoComponent>;
  let seed: CacheService;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({ imports: [DriversInfoComponent], providers: provideComponentTesting() });
    seed = new CacheService();
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
    TestBed.inject(CacheService).clearCache();
    seed.clearCache();
    localStorage.clear();
    jasmine.clock().uninstall();
  });

  it('E: keeps the driver profile on its skeleton while persisted data awaits version validation', () => {
    const info: DriverInfo = {
      driver: driverPointsFixture.driver, totalPoints: 336, victories: 6, podiums: 15,
      poles: 9, fastlaps: 4, averagePosition: 2.4, racesFinished: 17,
      penalties: 0, bestPosition: 1, championships: 2,
      last5Results: [] as unknown as DriverInfo['last5Results']
    };
    seed.updateVersion(29);
    seed.getOrLoad('infoByDriverName-Piloto de prueba-0', () => of(info)).subscribe();
    jasmine.clock().tick(300);
    const reload = TestBed.inject(CacheService);
    expect(reload.getCache().get('infoByDriverName-Piloto de prueba-0')?.totalPoints).toBe(336);

    fixture = TestBed.createComponent(DriversInfoComponent);
    fixture.detectChanges();
    // Leave the season request pending: the profile must not bypass getOrLoad via loadCache.
    expect(fixture.nativeElement.querySelector('.loading-profile')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('header')).toBeNull();
    expect(fixture.nativeElement.querySelector('.key-stats')).toBeNull();
  });
});
describe('DriversInfoComponent season navigation', () => {
  const season = new Season(42, 'Primera', 1);
  const otherSeason = new Season(43, 'Segunda', 2);
  const info: DriverInfo = {
    driver: driverPointsFixture.driver,
    poles: 0, fastlaps: 0, racesFinished: 0, totalPoints: 0,
    championships: 0, penalties: 0, bestPosition: 0,
    podiums: 0, victories: 0, averagePosition: 0,
    last5Results: [] as unknown as DriverInfo['last5Results']
  };
  let fixture: ComponentFixture<DriversInfoComponent>;
  let fetchInfo: jasmine.Spy;
  let navigate: jasmine.Spy;
  let params: BehaviorSubject<{ name: string }>;
  let route: ActivatedRoute;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DriversInfoComponent], providers: provideComponentTesting() });
    route = TestBed.inject(ActivatedRoute);
    params = new BehaviorSubject({ name: 'Piloto_de_prueba' });
    Object.assign(route, { params });
    spyOn(TestBed.inject(SeasonApiService), 'getSeasonByDriverName').and.returnValue(of([season, otherSeason]));
    fetchInfo = spyOn(TestBed.inject(DriverApiService), 'getInfoByDriverName').and.returnValue(of(info));
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => fixture?.destroy());

  async function render(value?: string) {
    Object.assign(route.snapshot, { queryParamMap: convertToParamMap(value === undefined ? {} : { season: value }) });
    fixture = TestBed.createComponent(DriversInfoComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
  }

  it('opens a valid season by number and keeps Total first and selectable', async () => {
    const selector = await render('1');
    expect(selector.seasonForm.get('season')!.value).toEqual(season);
    expect(selector.seasons()[0].name).toBe('Total');
    expect(fetchInfo).toHaveBeenCalledOnceWith('Piloto de prueba', 1);
    expect(fixture.nativeElement.querySelector('.back-link').getAttribute('href')).toBe('/drivers?season=1');
  });

  for (const value of [undefined, '', 'invalid', '1.5', '1e0', '-1', '999', '9007199254740993']) {
    it('falls back to Total for season ' + value, async () => {
      const selector = await render(value);
      expect(selector.seasonForm.get('season')!.value.number).toBe(0);
      expect(fetchInfo).toHaveBeenCalledOnceWith('Piloto de prueba', 0);
      expect(fixture.nativeElement.querySelector('.back-link').getAttribute('href')).toBe('/drivers');
    });
  }

  it('replaces the URL on a user selection and removes season for Total', async () => {
    const selector = await render('1');
    navigate.calls.reset();
    fetchInfo.calls.reset();
    selector.seasonForm.get('season')!.setValue(otherSeason);
    expect(fetchInfo).toHaveBeenCalledOnceWith('Piloto de prueba', 2);
    expect(navigate).toHaveBeenCalledOnceWith([], {
      relativeTo: route, queryParams: { season: 2 }, queryParamsHandling: 'merge', replaceUrl: true
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.back-link').getAttribute('href')).toBe('/drivers?season=2');
    navigate.calls.reset();
    selector.seasonForm.get('season')!.setValue(selector.seasons()[0]);
    expect(fetchInfo).toHaveBeenCalledWith('Piloto de prueba', 0);
    expect(navigate).toHaveBeenCalledOnceWith([], {
      relativeTo: route, queryParams: { season: null }, queryParamsHandling: 'merge', replaceUrl: true
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.back-link').getAttribute('href')).toBe('/drivers');
  });

  it('initializes the new driver when the route reuses the component without navigation loops', async () => {
    await render('1');
    fetchInfo.calls.reset();
    navigate.calls.reset();
    Object.assign(route.snapshot, { queryParamMap: convertToParamMap({ season: '2' }) });
    params.next({ name: 'Otro_piloto' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fetchInfo).toHaveBeenCalledOnceWith('Otro piloto', 2);
    expect(navigate).toHaveBeenCalledTimes(1);
    params.next({ name: 'Otro_piloto' });
    fixture.detectChanges();
    expect(fetchInfo).toHaveBeenCalledTimes(1);
  });
});

describe('DriversInfoComponent team history and classification', () => {
  let fixture: ComponentFixture<DriversInfoComponent>;
  let component: DriversInfoComponent;
  let history: jasmine.Spy;
  let points: jasmine.Spy;
  let infoRequest: jasmine.Spy;
  let handleError: jasmine.Spy;
  const total = new Season(0, 'Total', 0);
  const season1 = new Season(1, 'Primera', 1);
  const season2 = new Season(2, 'Segunda', 2);
  const info: DriverInfo = {
    driver: driverPointsFixture.driver,
    poles: 0, fastlaps: 0, racesFinished: 0, totalPoints: 25,
    championships: 0, penalties: 0, bestPosition: 0,
    podiums: 0, victories: 0, averagePosition: 0,
    last5Results: [] as unknown as DriverInfo['last5Results']
  };
  function entries(names: string[]): DriverTeamHistoryEntry[] {
    return names.map((name, index) => ({
      season: new Season(index + 1, 'Temporada', index + 1),
      team: { ...info.driver.team, id: index + 10, name, logoImage: name + '.png' }
    }));
  }
  function standing(id: number, name: string, totalPoints: number): DriverPoints {
    return { ...driverPointsFixture, driver: { ...info.driver, id, name }, totalPoints };
  }
  function select(season: Season): void {
    component['onSeasonChange'](season);
    fixture.detectChanges();
  }
  function teamLinks(): HTMLAnchorElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('header a.team-link'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DriversInfoComponent], providers: provideComponentTesting() });
    const api = TestBed.inject(DriverApiService);
    infoRequest = spyOn(api, 'getInfoByDriverName').and.returnValue(of(info));
    history = spyOn(api, 'getTeamHistoryByDriverName').and.returnValue(of([]));
    points = spyOn(TestBed.inject(ResultApiService), 'getAllDriverPoints').and.returnValue(of([driverPointsFixture]));
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    handleError = spyOn(TestBed.inject(UtilsService), 'handleError').and.returnValue(of([]));
    fixture = TestBed.createComponent(DriversInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  for (const names of [
    ['Williams', 'McLaren', 'McLaren'],
    ['Williams', 'Williams', 'Williams'],
    ['Aston Martin'],
    ['Williams', 'McLaren', 'Williams'],
    []
  ]) {
    it('renders chronological native team links and deduplicates only consecutive names: ' + names.join(', '), () => {
      history.and.returnValue(of(entries(names)));
      select(total);
      const expected = names.length ? names.filter((name, index) => !index || name !== names[index - 1]) : ['Ferrari'];
      expect(teamLinks().map(link => link.querySelector('span')!.textContent!.trim())).toEqual(expected);
      teamLinks().forEach((link, index) => {
        expect(link.getAttribute('href')).toBe('/teams/' + expected[index].replaceAll(' ', '_'));
        expect(link.querySelector('img')!.alt).toBe('');
        expect(link.querySelector('img')!.getAttribute('width')).toBe('32');
      });
      expect(history).toHaveBeenCalledOnceWith('Piloto de prueba');
      expect(points).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.ranking-badge')).toBeNull();
      expect(fixture.nativeElement.querySelector('.classification-stat')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.key-stats > .stat').length).toBe(4);
      const teamClass = expected.at(-1)!.replaceAll(' ', '_');
      expect(fixture.nativeElement.querySelector('header').classList.contains('bg-' + teamClass)).toBeTrue();
      expect(fixture.nativeElement.querySelector('header').classList.contains('on-' + teamClass)).toBeTrue();
      expect(fixture.nativeElement.querySelector('.points-bar').classList.contains('bg-' + teamClass)).toBeTrue();
      const separators = fixture.nativeElement.querySelectorAll('.team-history > [aria-hidden="true"]');
      expect(separators.length).toBe(expected.length - 1);
      const spoken = fixture.nativeElement.querySelectorAll('.team-history > .sr-only');
      expect(Array.from(spoken as NodeListOf<HTMLElement>, node => node.textContent)).toEqual(expected.slice(1).map(() => 'luego'));
    });
  }

  it('shows the current team while history loads and after a history error', () => {
    const pending = new Subject<DriverTeamHistoryEntry[]>();
    history.and.returnValue(pending);
    select(total);
    expect(teamLinks()[0].textContent).toContain('Ferrari');
    pending.error('offline');
    fixture.detectChanges();
    expect(teamLinks().length).toBe(1);
    expect(teamLinks()[0].getAttribute('href')).toBe('/teams/Ferrari');
    expect(handleError).toHaveBeenCalledWith('No se pudo cargar el recorrido de equipos', 'offline', []);
  });

  it('falls back to the selected season team when history has no entries for that season', () => {
    history.and.returnValue(of(entries(['Williams'])));
    infoRequest.and.returnValue(of({ ...info, driver: { ...info.driver, team: { ...info.driver.team, name: 'Kick Sauber' } } }));
    select(season2);
    expect(history).toHaveBeenCalledOnceWith('Piloto de prueba');
    expect(teamLinks().length).toBe(1);
    expect(teamLinks()[0].getAttribute('href')).toBe('/teams/Kick_Sauber');
    expect(points).toHaveBeenCalledOnceWith(2);
    expect(fixture.nativeElement.querySelector('header').classList.contains('bg-Kick_Sauber')).toBeTrue();
  });

  for (const selected of [total, new Season(3, 'Tercera', 3)]) {
    it('uses Robe first team after a mid-season transfer for season ' + selected.number, () => {
      const transferHistory = entries(['Ferrari', 'Alpine', 'Kick Sauber', 'Ferrari', 'Ferrari']);
      transferHistory.slice(3).forEach(entry => entry.season = transferHistory[2].season);
      history.and.returnValue(of(transferHistory));
      const transferredInfo = {
        ...info,
        driver: { ...info.driver, team: transferHistory[2].team },
        last5Results: [{
          race: { id: 1, name: 'Carrera', flagImage: 'flag.png', dateStart: new Date(), season: transferHistory[2].season },
          position: { positionNumber: 1, points: 25 }, pole: 0, fastlap: 0
        }] as DriverInfo['last5Results']
      };
      infoRequest.and.returnValue(of(transferredInfo));
      select(selected);
      const expected = selected.number ? ['Kick Sauber', 'Ferrari'] : ['Ferrari', 'Alpine', 'Kick Sauber', 'Ferrari'];
      expect(teamLinks().map(link => link.querySelector('span')!.textContent!.trim())).toEqual(expected);
      expect(teamLinks().filter(link => link.textContent!.includes('(equipo principal)')).length).toBe(1);
      const principal = teamLinks().find(link => link.getAttribute('href') === '/teams/Kick_Sauber')!;
      expect(principal.textContent).toContain(' (equipo principal)');
      expect(principal.querySelector('span')!.classList.contains('font-normal')).toBeFalse();
      expect(teamLinks().map(link => link.getAttribute('href'))).toEqual(expected.map(name => '/teams/' + name.replaceAll(' ', '_')));
      const hero = fixture.nativeElement.querySelector('header');
      expect(hero.classList.contains('bg-Kick_Sauber')).toBeTrue();
      expect(hero.classList.contains('on-Kick_Sauber')).toBeTrue();
      expect(hero.classList.contains('bg-Ferrari')).toBeFalse();
      for (const accent of fixture.nativeElement.querySelectorAll('.points-bar, .timeline-dot')) {
        expect(accent.classList.contains('bg-Kick_Sauber')).toBeTrue();
      }
      expect(fixture.nativeElement.querySelector('.hero-photo').getAttribute('src'))
        .toBe(TestBed.inject(ImageService).getImageUrl(transferredInfo.driver.driverImage.replaceAll(' ', '_')));
      expect(infoRequest).toHaveBeenCalledWith('Piloto de prueba', selected.number);
    });
  }

  for (const selected of [total, season1]) {
    for (const fails of [false, true]) {
      it('keeps fallback colors while loading and on ' + (fails ? 'error' : 'empty history') + ' in season ' + selected.number, () => {
        const pending = new Subject<DriverTeamHistoryEntry[]>();
        history.and.returnValue(pending);
        select(selected);
        const expectFallback = () => {
          expect(teamLinks().map(link => link.getAttribute('href'))).toEqual(['/teams/Ferrari']);
          expect(fixture.nativeElement.querySelector('header').classList.contains('bg-Ferrari')).toBeTrue();
          expect(fixture.nativeElement.querySelector('header').classList.contains('on-Ferrari')).toBeTrue();
          expect(fixture.nativeElement.querySelector('.points-bar').classList.contains('bg-Ferrari')).toBeTrue();
        };
        expectFallback();
        if (fails) pending.error('offline');
        else pending.next([]);
        fixture.detectChanges();
        expectFallback();
      });
    }
  }

  it('keeps known history colors while switching seasons and awaiting a refresh', () => {
    const pending = new Subject<DriverTeamHistoryEntry[]>();
    const knownHistory = entries(['Williams', 'McLaren']);
    history.and.returnValues(of(knownHistory), pending);
    select(total);
    expect(fixture.nativeElement.querySelector('header').classList.contains('bg-McLaren')).toBeTrue();
    select(season2);
    expect(teamLinks().map(link => link.getAttribute('href'))).toEqual(['/teams/McLaren']);
    expect(fixture.nativeElement.querySelector('header').classList.contains('bg-McLaren')).toBeTrue();
    pending.next(knownHistory);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('header').classList.contains('bg-McLaren')).toBeTrue();
  });

  for (const selected of [total, new Season(3, 'Tercera', 3)]) {
    it('uses the first record of the latest season in season ' + selected.number, () => {
      const tied = entries(['Alpine', 'Kick Sauber', 'Ferrari']);
      tied.slice(1).forEach(entry => {
        entry.season = new Season(3, 'Tercera', 3);
      });
      history.and.returnValue(of(tied));
      select(selected);
      expect(fixture.nativeElement.querySelector('header').classList.contains('bg-Kick_Sauber')).toBeTrue();
      expect(fixture.nativeElement.querySelector('header').classList.contains('on-Kick_Sauber')).toBeTrue();
      expect(teamLinks().at(-1)!.textContent).not.toContain('(equipo principal)');
      expect(teamLinks().find(link => link.getAttribute('href') === '/teams/Kick_Sauber')!.textContent)
        .toContain('(equipo principal)');
    });
  }

  it('keeps Robe principal color while info and history refresh in either order', () => {
    const season3 = new Season(3, 'Tercera', 3);
    const known = entries(['Alpine', 'Kick Sauber', 'Ferrari']);
    known.slice(1).forEach(entry => entry.season = season3);
    history.and.returnValue(of(known));
    select(total);
    const expectKick = () => {
      expect(fixture.nativeElement.querySelector('header').classList.contains('bg-Kick_Sauber')).toBeTrue();
      expect(fixture.nativeElement.querySelector('header').classList.contains('on-Kick_Sauber')).toBeTrue();
      expect(fixture.nativeElement.querySelector('.points-bar').classList.contains('bg-Kick_Sauber')).toBeTrue();
    };
    expectKick();
    for (const historyFirst of [false, true]) {
      const pendingHistory = new Subject<DriverTeamHistoryEntry[]>();
      const pendingInfo = new Subject<DriverInfo>();
      history.and.returnValue(pendingHistory);
      infoRequest.and.returnValue(pendingInfo);
      select(historyFirst ? total : season3);
      expectKick();
      const refreshInfo = () => pendingInfo.next({ ...info, driver: { ...info.driver, team: known[1].team } });
      if (historyFirst) pendingHistory.next(known);
      else refreshInfo();
      fixture.detectChanges();
      expectKick();
      if (historyFirst) refreshInfo();
      else pendingHistory.next(known);
      fixture.detectChanges();
      expectKick();
    }
  });

  it('uses competition ranks, excludes vacancies and exposes an equivalent screen reader label', () => {
    points.and.returnValue(of([
      standing(9, 'Vacante', 1000), standing(10, 'vAcAnTe2', 900),
      standing(2, 'Líder', 100), standing(3, 'Empatado', 100), driverPointsFixture
    ]));
    select(season1);
    const cell: HTMLElement = fixture.nativeElement.querySelector('.classification-stat');
    expect(cell.querySelector('dt')!.textContent).toBe('Clasificación');
    expect(cell.querySelector('.classification-value')!.textContent).toBe('3.º');
    expect(cell.querySelector('.classification-total')!.textContent).toBe('de 3');
    expect(cell.querySelector('.sr-only')!.textContent).toBe('Puesto 3 de 3 en la clasificación');
    expect(fixture.nativeElement.querySelector('.key-stats').firstElementChild).toBe(cell);
    expect(fixture.nativeElement.querySelectorAll('.key-stats > .stat').length).toBe(5);
    expect(fixture.nativeElement.querySelector('header .ranking-badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('header').textContent).not.toContain('clasificación');
    points.and.returnValue(of([standing(2, 'Otro empatado', 25), driverPointsFixture]));
    select(season2);
    expect(fixture.nativeElement.querySelector('.classification-value').textContent).toBe('1.º');
    expect(fixture.nativeElement.querySelector('.classification-stat .sr-only').textContent).toBe('Puesto 1 de 2 en la clasificación empatado');
    infoRequest.and.returnValue(of({ ...info, driver: standing(2, 'Otro empatado', 25).driver }));
    select(season2);
    expect(fixture.nativeElement.querySelector('.classification-value').textContent).toBe('1.º');
  });

  it('matches historical driver names when their season ids differ', () => {
    points.and.returnValue(of([standing(999, info.driver.name, 25)]));
    select(season2);
    expect(fixture.nativeElement.querySelector('.classification-value').textContent).toBe('1.º');
  });

  for (const position of [1, 2, 3, 4, 15]) {
    it('renders ordinal ' + position + ' with podium color only for the first three positions', () => {
      points.and.returnValue(of([
        ...Array.from({ length: position - 1 }, (_, index) => standing(index + 10, 'Rival ' + index, 100)),
        driverPointsFixture
      ]));
      select(season1);
      const value: HTMLElement = fixture.nativeElement.querySelector('.classification-value');
      expect(value.textContent).toBe(position + '.º');
      expect(value.querySelector('sup')!.textContent).toBe('.º');
      expect(value.getAttribute('aria-hidden')).toBe('true');
      for (const podium of [1, 2, 3]) {
        expect(value.classList.contains('text-podium-' + podium)).toBe(position === podium);
      }
      expect(fixture.nativeElement.querySelector('.classification-total').textContent).toBe('de ' + position);
      expect(fixture.nativeElement.querySelector('.classification-stat .sr-only').textContent)
        .toBe('Puesto ' + position + ' de ' + position + ' en la clasificación');
    });
  }

  for (const standings of [[], [standing(2, 'Other', 25)], [standing(1, info.driver.name, 0)], [standing(1, 'Vacante1', 25)],
    [standing(1, info.driver.name, 0), standing(2, 'Vacante', 100)]]) {
    it('omits the classification cell when absent, vacant or without any championship points: ' + JSON.stringify(standings.map(point => point.driver.name)), () => {
      points.and.returnValue(of(standings));
      select(season1);
      expect(fixture.nativeElement.querySelector('.classification-stat')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.key-stats > .stat').length).toBe(4);
      expect(fixture.nativeElement.querySelector('.key-stats').classList.contains('has-classification')).toBeFalse();
      expect(fixture.nativeElement.querySelectorAll('.key-stats .points-bar').length).toBe(1);
      expect(fixture.nativeElement.querySelector('.key-stats').firstElementChild.querySelector('.points-bar')).not.toBeNull();
    });
  }

  it('silently omits the classification cell after a standings failure', () => {
    points.and.returnValue(throwError(() => 'offline'));
    select(season1);
    expect(fixture.nativeElement.querySelector('.classification-stat')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.key-stats > .stat').length).toBe(4);
    expect(handleError).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('.key-stats .points-bar').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.key-stats').firstElementChild.querySelector('.points-bar')).not.toBeNull();
    expect(teamLinks().length).toBe(1);
  });

  it('updates all header details via real season tabs and ignores late responses', () => {
    const oldHistory = new Subject<DriverTeamHistoryEntry[]>();
    const oldPoints = new Subject<DriverPoints[]>();
    history.and.returnValues(oldHistory, of([]), of([]), of(entries(['Williams', 'McLaren'])));
    points.and.returnValues(oldPoints, of([driverPointsFixture]));
    const selector = fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
    selector.seasons.set([total, season1, season2]);
    fixture.detectChanges();
    const click = (index: number) => {
      fixture.nativeElement.querySelectorAll('select-seasons button')[index].click();
      fixture.detectChanges();
    };
    click(0);
    click(1);
    oldHistory.next(entries(['Haas']));
    fixture.detectChanges();
    expect(teamLinks()[0].textContent).toContain('Ferrari');
    infoRequest.and.returnValue(of({ ...info, driver: { ...info.driver, team: { ...info.driver.team, name: 'Aston Martin' } } }));
    click(2);
    expect(teamLinks()[0].getAttribute('href')).toBe('/teams/Aston_Martin');
    expect(fixture.nativeElement.querySelector('header').classList.contains('bg-Aston_Martin')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.classification-value').textContent).toBe('1.º');
    click(0);
    oldPoints.next([driverPointsFixture]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.classification-stat')).toBeNull();
    expect(teamLinks().map(link => link.querySelector('span')!.textContent!.trim())).toEqual(['Williams', 'McLaren']);
  });
});
