import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { provideComponentTesting, teamPointsFixture } from '../../../../testing/component-test-providers';
import { Team } from '../../../../shared/models/team';
import { TeamWithDrivers } from '../../../../shared/models/teamWithDrivers';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { ImageService } from '../../../../shared/services/image.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { ERROR_TEAM_FETCH } from '../../../constants';
import { TeamsRankingComponent } from './teams-ranking.component';

describe('TeamsRankingComponent', () => {
  let fixture: ComponentFixture<TeamsRankingComponent>;
  let results: jasmine.Spy;
  let teams: jasmine.Spy;
  const examples: TeamWithDrivers[] = ([
    ['McLaren', 414, 'assets/teams/season3/Mclaren/logo/logo.webp', 'assets/teams/season3/Mclaren/car/car.avif', [['SmokingWeed', 336, 'assets/drivers/season3/SmokingWeed/driver.webp'], ['PepePerez', 78, 'assets/drivers/season3/PepePerez/driver.webp']]],
    ['Ferrari', 407, 'assets/teams/season3/Ferrari/logo/logo.webp', 'assets/teams/season3/Ferrari/car/car.avif', [['Bubapu', 243, 'assets/drivers/season3/Bubapu/driver.webp'], ['Escapa', 24, 'assets/drivers/season3/Escapa/driver.webp']]],
    ['Red Bull', 309, 'assets/teams/season3/RedBull/logo/logo.webp', 'assets/teams/season3/RedBull/car/car.avif', [['Moraga', 271, 'assets/drivers/season3/Moraga/driver.webp'], ['Ismallen', 38, 'assets/drivers/season3/Ismallen/driver.webp']]],
    ['Williams', 256, 'assets/teams/season3/Williams/logo/logo.webp', 'assets/teams/season3/Williams/car/car.avif', [['AlbertoMD', 92, 'assets/drivers/season3/AlbertoMD/driver.webp'], ['AlbertoPJ', 164, 'assets/drivers/season3/AlbertoPJ/driver.webp']]],
    ['Aston Martin', 222, 'assets/teams/season3/AstonMartin/logo/logo.webp', 'assets/teams/season3/AstonMartin/car/car.avif', [['Dani Calde', 99, ''], ['Fernando', 123, 'assets/drivers/season3/Fernando/driver.webp']]],
    ['Mercedes', 175, 'assets/teams/season3/Mercedes/logo/logo.webp', 'assets/teams/season3/Mercedes/car/car.avif', [['Juannudi', 161, 'assets/drivers/season3/Juannudi/driver.webp'], ['Ricciardo Leon', 12, 'assets/drivers/season3/Ricciardo_Leon/driver.webp']]],
    ['Kick Sauber', 60, 'assets/teams/season3/KickSauber/logo/logo.webp', 'assets/teams/season3/KickSauber/car/car.avif', [['Robe', 60, 'assets/drivers/season3/Robe/driver.webp'], ['Vacante2', 0, 'assets/drivers/default/default.webp']]],
    ['Haas', 46, 'assets/teams/season3/Haas/logo/logo.webp', 'assets/teams/season3/Haas/car/car.avif', [['Avantifer', 36, 'assets/drivers/season3/Avantifer/driver.webp'], ['Alberto430', 10, 'assets/drivers/default/default.webp']]],
    ['Alpine', 26, 'assets/teams/season3/Alpine/logo/logo.webp', 'assets/teams/season3/Alpine/car/car.avif', [['Sinergia', 12, 'assets/drivers/season3/Sinergia/driver.webp'], ['Quique', 14, 'assets/drivers/season3/Quique/driver.webp']]],
    ['RB', 0, 'assets/teams/season3/RB/logo/logo.webp', 'assets/teams/season3/RB/car/car.avif', [['Vacante', 0, 'assets/drivers/default/default.webp'], ['Vacante3', 0, 'assets/drivers/default/default.webp']]]
  ] satisfies [string, number, string, string, [string, number, string][]][]).map(([name, totalPoints, logoImage, carImage, drivers], index) => {
    const team = { ...teamPointsFixture.team, id: index + 1, name, logoImage, carImage };
    const points = drivers.map(([name, totalPoints, driverImage], seat) => ({
      ...teamPointsFixture.driver1, totalPoints,
      driver: { ...teamPointsFixture.driver1.driver, id: index * 2 + seat + 1, name, driverImage, team }
    }));
    return { ...teamPointsFixture, team, totalPoints, driver1: points[0], driver2: points[1] };
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TeamsRankingComponent], providers: provideComponentTesting() });
    results = spyOn(TestBed.inject(TeamApiService), 'getllTeamsWithDrivers').and.returnValue(of(examples));
    teams = spyOn(TestBed.inject(TeamApiService), 'getAllTeams').and.returnValue(of(examples.map(row => row.team)));
    spyOn(TestBed.inject(ImageService), 'getImageUrl').and.callFake((path: string) => path);
    fixture = TestBed.createComponent(TeamsRankingComponent);
  });

  afterEach(() => fixture.destroy());

  async function render(): Promise<void> {
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 120));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function rows(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('ol > li')); }

  it('shows skeletons while loading and a semantic ten-team ranking with leader gaps', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('p-skeleton')).toHaveSize(10);
    expect(fixture.nativeElement.querySelector('ol')).toBeNull();
    await render();
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(rows()).toHaveSize(10);
    expect(rows().map(row => row.getAttribute('value'))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(rows()[0].querySelector('.points-score')?.textContent).toContain('414 PTS');
    expect(rows()[0].querySelector('.points-gap')?.textContent).toBe('');
    expect(rows()[1].querySelector('.points-gap')?.textContent).toBe('-7');
    expect(rows()[9].querySelector('.points-gap')?.textContent).toBe('-414');
    for (const position of [1, 2, 3]) expect(rows()[position - 1].querySelector('.text-podium-' + position)).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.position-change, p-progressbar')).toBeNull();
    expect(teams).not.toHaveBeenCalled();
  });

  it('uses competition ranks and announces ties only to screen readers before filtering', async () => {
    results.and.returnValue(of([100, 80, 60, 60, 20].map((totalPoints, index) => ({ ...examples[index], totalPoints }))));
    await render();
    expect(rows().map(row => row.getAttribute('value'))).toEqual(['1', '2', '3', '3', '5']);
    rows().forEach((row, index) => {
      const rank = row.querySelector('.rank-position')!;
      expect(rank.querySelector('.sr-only')?.textContent ?? '').toBe(index === 2 || index === 3 ? ' empatado' : '');
      const visible = rank.cloneNode(true) as Element;
      visible.querySelector('.sr-only')?.remove();
      expect(visible.textContent).toBe(['01', '02', '03', '03', '05'][index]);
    });
    fixture.componentRef.setInput('selectedTeams', ['Williams']);
    fixture.detectChanges();
    expect(rows()).toHaveSize(1);
    expect(rows()[0].getAttribute('value')).toBe('3');
    expect(rows()[0].querySelector('.rank-position .sr-only')?.textContent).toBe(' empatado');
    expect(rows()[0].querySelector('.points-gap')?.textContent).toBe('-40');
  });

  it('keeps all tied leaders gold with empty gaps even with zero points', async () => {
    results.and.returnValue(of(examples.slice(0, 2).map(row => ({ ...row, totalPoints: 0 }))));
    await render();
    for (const row of rows()) {
      expect(row.getAttribute('value')).toBe('1');
      expect(row.querySelector('.text-podium-1 .sr-only')?.textContent).toBe(' empatado');
      expect(row.querySelector('.points-gap')?.textContent).toBe('');
    }
  });

  it('filters teams without fetching again and preserves their global gap and position', async () => {
    fixture.componentRef.setInput('selectedTeams', ['Red Bull']);
    await render();
    expect(rows()).toHaveSize(1);
    expect(rows()[0].getAttribute('value')).toBe('3');
    expect(rows()[0].querySelector('.points-gap')?.textContent).toBe('-105');
    for (const selection of [[], ['Todos los equipos']]) {
      fixture.componentRef.setInput('selectedTeams', selection);
      fixture.detectChanges();
      expect(rows()).toHaveSize(10);
    }
    fixture.componentRef.setInput('selectedTeams', ['Inexistente']);
    fixture.detectChanges();
    expect(rows()).toHaveSize(0);
    expect(results).toHaveBeenCalledTimes(1);
  });

  it('renders both drivers, vacant seats without photos and initials for missing or default photos', async () => {
    await render();
    expect(rows().every(row => row.querySelectorAll('.team-driver').length === 2)).toBeTrue();
    expect(rows()[0].querySelector('.driver-name')?.textContent).toBe('SmokingWeed');
    expect(rows()[0].querySelector('.driver-points')?.textContent).toBe('336 PTS');
    expect(rows()[4].querySelector('.driver-initials')?.textContent).toBe('DC');
    expect(rows()[7].querySelector('.driver-initials')?.textContent).toBe('AL');
    for (const seat of Array.from(fixture.nativeElement.querySelectorAll('.team-driver:has(.vacant)')) as HTMLElement[]) {
      expect(seat.querySelector('img')).toBeNull();
      expect(seat.querySelector('.driver-name')?.textContent).toBe('Vacante');
      expect(seat.querySelector('.driver-points')?.textContent).toBe('0 PTS');
      expect(seat.querySelector('.vacant')?.classList.contains('border-dashed')).toBeTrue();
    }
    for (const name of Array.from(fixture.nativeElement.querySelectorAll('.driver-name')) as HTMLElement[]) {
      expect(name.textContent).not.toMatch(/Vacante\d/);
    }
  });

  it('falls back to the requested season teams with zero points and no invented drivers', async () => {
    results.and.returnValue(of([]));
    fixture.componentRef.setInput('season', { ...teamPointsFixture.team.season, number: 2 });
    await render();
    expect(results).toHaveBeenCalledWith(2);
    expect(teams).toHaveBeenCalledWith(2);
    expect(rows()).toHaveSize(10);
    for (const row of rows()) {
      expect(row.querySelector('.points-score strong')?.textContent).toBe('0');
      expect(row.querySelector('.points-gap')?.textContent).toBe('');
      expect(row.querySelector('.team-driver')).toBeNull();
    }
    expect(fixture.nativeElement.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('keeps skeletons until the fallback finishes and cancels obsolete season requests', async () => {
    const previous = new Subject<TeamWithDrivers[]>();
    results.and.returnValue(previous);
    fixture.detectChanges();
    const fallback = new Subject<Team[]>();
    results.and.returnValue(of([]));
    teams.and.returnValue(fallback);
    fixture.componentRef.setInput('season', { ...teamPointsFixture.team.season, number: 2 });
    await render();
    expect(previous.observed).toBeFalse();
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    previous.next(examples);
    fallback.next([examples[0].team]);
    fixture.detectChanges();
    expect(rows()).toHaveSize(1);
    expect(rows()[0].querySelector('.points-score strong')?.textContent).toBe('0');
    fixture.destroy();
    expect(fallback.observed).toBeFalse();
  });

  it('handles errors through UtilsService and finishes loading even when the fallback fails', async () => {
    const error = new Error('offline');
    const handler = spyOn(TestBed.inject(UtilsService), 'handleError').and.callThrough();
    results.and.returnValue(throwError(() => error));
    teams.and.returnValue(throwError(() => error));
    await render();
    expect(handler).toHaveBeenCalledWith(ERROR_TEAM_FETCH, error, []);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(rows()).toHaveSize(0);
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
  });

  it('renders one accessible team link and decorative car with dimensions per row', async () => {
    await render();
    rows().forEach((row, index) => {
      const links = row.querySelectorAll<HTMLAnchorElement>('a');
      expect(links).toHaveSize(1);
      expect(links[0].getAttribute('href')).toBe('/teams/' + examples[index].team.name.replaceAll(' ', '_'));
      expect(links[0].querySelector('.sr-only')?.textContent).toBe('Ver ficha de ');
      expect(links[0].closest('h3')).not.toBeNull();
      expect(row.querySelector('.profile-indicator')?.getAttribute('aria-hidden')).toBe('true');
      const car = row.querySelector<HTMLImageElement>('.team-car')!;
      expect(car.getAttribute('alt')).toBe('');
      expect(car.getAttribute('src')).toBe(examples[index].team.carImage);
      expect(car.getAttribute('width')).toBe('360');
      expect(car.getAttribute('height')).toBe('84');
      expect(car.loading).toBe(index === 0 ? 'eager' : 'lazy');
      for (const image of Array.from(row.querySelectorAll('img'))) {
        expect(image.width).toBeGreaterThan(0);
        expect(image.height).toBeGreaterThan(0);
      }
    });
  });

  it('measures real styles, contrast, stretched targets and non-overlapping rows in both themes', async () => {
    await render();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');
    function luminance(color: string): number {
      const c = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const n = value / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
      return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    }
    function contrast(a: string, b: string): number {
      const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (high + 0.05) / (low + 0.05);
    }
    for (const dark of [false, true]) {
      for (const width of [320, 360, 390, 768, 1024, 1296, 1440]) {
        const frame = document.createElement('iframe');
        Object.assign(frame.style, { width: width + 'px', height: '2200px', border: '0' });
        document.body.append(frame);
        try {
          const doc = frame.contentDocument!;
          doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body><div class="my-container mx-auto"><section class="bg-panel border border-rule rounded-panel p-3 md:p-6">' + fixture.nativeElement.outerHTML + '</section></div></body>';
          doc.documentElement.classList.toggle('dark', dark);
          await doc.fonts.ready;
          const view = frame.contentWindow!;
          const context = (dark ? 'dark/' : 'light/') + width;
          expect(doc.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(doc.documentElement.clientWidth);
          for (const row of Array.from(doc.querySelectorAll<HTMLElement>('.ranking-row'))) {
            const rect = row.getBoundingClientRect();
            expect(row.scrollWidth).withContext(context + '/row overflow').toBeLessThanOrEqual(row.clientWidth);
            expect(rect.height).withContext(context + '/row height').toBeGreaterThanOrEqual(width < 768 ? 176 : 120);
            const background = view.getComputedStyle(row).backgroundColor;
            for (const text of Array.from(row.querySelectorAll('.rank-position, .team-name, .driver-name, .driver-points, .points-score, .points-gap'))) {
              expect(contrast(view.getComputedStyle(text).color, background)).withContext(context + '/contrast').toBeGreaterThanOrEqual(4.5);
            }
            const link = row.querySelector<HTMLAnchorElement>('a')!;
            const overlay = view.getComputedStyle(link, '::after');
            expect(overlay.position).toBe('absolute');
            expect(parseFloat(overlay.width)).toBeCloseTo(row.clientWidth, 0);
            expect(parseFloat(overlay.height)).toBeCloseTo(row.clientHeight, 0);
            link.focus({ preventScroll: true });
            expect(view.getComputedStyle(row).outlineStyle).withContext(context + '/focus').toBe('solid');
            const name = row.querySelector('.team-name')!.getBoundingClientRect();
            const points = row.querySelector('.points-score')!.getBoundingClientRect();
            const car = row.querySelector('.team-car')!.getBoundingClientRect();
            const drivers = row.querySelector('.team-drivers')!.getBoundingClientRect();
            const rank = row.querySelector('.rank-position')!.getBoundingClientRect();
            const logo = row.querySelector('.team-badge')!.getBoundingClientRect();
            expect(name.width).withContext(context + '/visible team name').toBeGreaterThan(0);
            for (const driver of Array.from(row.querySelectorAll<HTMLElement>('.driver-name'))) {
              expect(driver.getBoundingClientRect().width).withContext(context + '/visible driver name').toBeGreaterThan(0);
            }
            expect(rank.right).withContext(context + '/position before logo').toBeLessThanOrEqual(logo.left);
            expect(name.right).withContext(context + '/name before points').toBeLessThanOrEqual(points.left + 0.5);
            if (width < 768) {
              expect(car.bottom).withContext(context + '/car above name').toBeLessThanOrEqual(name.top);
              expect(drivers.top).withContext(context + '/drivers below heading').toBeGreaterThanOrEqual(Math.max(name.bottom, points.bottom));
              const arrow = row.querySelector('.profile-indicator')!.getBoundingClientRect();
              expect(arrow.width).toBeGreaterThanOrEqual(44);
              expect(arrow.height).toBeGreaterThanOrEqual(44);
              expect(parseFloat(overlay.width)).toBeGreaterThanOrEqual(44);
              expect(parseFloat(overlay.height)).toBeGreaterThanOrEqual(44);
            } else {
              expect(name.right).withContext(context + '/team before drivers').toBeLessThanOrEqual(drivers.left);
              expect(drivers.right).withContext(context + '/drivers before points').toBeLessThanOrEqual(points.left);
              expect(points.right).withContext(context + '/points before car').toBeLessThanOrEqual(car.left);
              expect(car.height).toBe(84);
            }
          }
          console.info('TEAMS_LAYOUT', context, 'teams=10', 'scrollWidth=' + doc.documentElement.scrollWidth);
        } finally { frame.remove(); }
      }
    }
  });
});
