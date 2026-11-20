import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { driverPointsFixture, provideComponentTesting } from '../../../../testing/component-test-providers';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { DriversRankingComponent, driverPosition, isVacantDriver, pointMetrics } from './drivers-ranking.component';

describe('DriversRankingComponent', () => {
  let fixture: ComponentFixture<DriversRankingComponent>;
  let results: jasmine.Spy;
  let drivers: jasmine.Spy;
  const standings: DriverPoints[] = [
    { ...driverPointsFixture, totalPoints: 200 },
    { ...driverPointsFixture, driver: { ...driverPointsFixture.driver, id: 2, name: 'Segundo piloto', team: { ...driverPointsFixture.driver.team, id: 2, name: 'Red Bull' } }, totalPoints: 135, positionChange: 'ADVANCED', positionChangeAmount: 2 },
    { ...driverPointsFixture, driver: { ...driverPointsFixture.driver, id: 3 }, totalPoints: 50, positionChange: 'DROPPED', positionChangeAmount: 1 }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DriversRankingComponent], providers: provideComponentTesting() });
    results = spyOn(TestBed.inject(ResultApiService), 'getAllDriverPoints').and.returnValue(of(standings));
    drivers = spyOn(TestBed.inject(DriverApiService), 'getAllDrivers').and.returnValue(of([driverPointsFixture.driver]));
    fixture = TestBed.createComponent(DriversRankingComponent);
  });

  afterEach(() => fixture.destroy());

  async function render() {
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 120));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function rows(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('ol li')); }

  function visibleRankText(rank: Element): string {
    const visible = rank.cloneNode(true) as Element;
    visible.querySelectorAll('.sr-only').forEach(node => node.remove());
    return visible.textContent!.trim();
  }

  it('calculates proportional widths and leader gaps with a pure function, including zero points', () => {
    expect(pointMetrics(200, 200, true)).toEqual({ percentage: 100, gap: '' });
    expect(pointMetrics(135, 200, false)).toEqual({ percentage: 67.5, gap: '-65' });
    expect(pointMetrics(0, 0, true)).toEqual({ percentage: 0, gap: '' });
    expect(pointMetrics(0, 0, false)).toEqual({ percentage: 0, gap: '-0' });
  });

  it('renders a semantic ranking, decorative bars, points, gaps and accessible position changes', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    await render();
    expect(fixture.nativeElement.querySelector('ol')).not.toBeNull();
    const ranking = rows();
    expect(ranking.length).toBe(3);
    expect((ranking[0].querySelector('.points-track > div') as HTMLElement).style.width).toBe('100%');
    expect((ranking[1].querySelector('.points-track > div') as HTMLElement).style.width).toBe('67.5%');
    expect(ranking[0].querySelector('.points-gap')?.textContent).toBe('');
    expect(ranking[1].querySelector('.points-gap')?.textContent).toBe('-65');
    expect(ranking[1].querySelector('.points-track')?.getAttribute('aria-hidden')).toBe('true');
    expect(ranking[1].querySelector('.points-score')?.textContent).toContain('135 PTS');
    expect(ranking[0].querySelector('.rank-position')?.classList.contains('text-podium-1')).toBeTrue();
    expect(ranking[0].querySelector('.position-change')?.textContent?.trim()).toBe('');
    expect(ranking[0].querySelector('.pi-arrow-up, .pi-arrow-down')).toBeNull();
    expect(ranking[1].querySelector('.position-change .sr-only')?.textContent?.trim()).toBe('Sube 2 puestos');
    expect(ranking[2].querySelector('.position-change .sr-only')?.textContent?.trim()).toBe('Baja 1 puesto');
    expect(ranking[1].querySelector('.text-sector-up')).not.toBeNull();
    expect(ranking[2].querySelector('.text-sector-down')).not.toBeNull();
    expect(drivers).not.toHaveBeenCalled();
  });

  it('filters teams while retaining the global position, width and gap', async () => {
    fixture.componentRef.setInput('selectedTeams', ['Red Bull']);
    await render();
    expect(rows().length).toBe(1);
    expect(rows()[0].querySelector('.rank-position')?.textContent).toBe('02');
    expect((rows()[0].querySelector('.points-track > div') as HTMLElement).style.width).toBe('67.5%');
    expect(rows()[0].querySelector('.points-gap')?.textContent).toBe('-65');
    fixture.componentRef.setInput('selectedTeams', ['Todos los equipos']);
    fixture.detectChanges();
    expect(rows().length).toBe(3);
    expect(results).toHaveBeenCalledTimes(1);
  });

  it('falls back to drivers from the requested season with empty bars and zero points', async () => {
    results.and.returnValue(of([]));
    fixture.componentRef.setInput('season', { ...driverPointsFixture.driver.season, number: 2 });
    await render();
    expect(results).toHaveBeenCalledWith(2);
    expect(drivers).toHaveBeenCalledWith(2);
    expect(rows().length).toBe(1);
    expect(rows()[0].querySelector('.points-score strong')?.textContent).toBe('0');
    expect((rows()[0].querySelector('.points-track > div') as HTMLElement).style.width).toBe('0%');
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
  });

  it('keeps skeletons until the fallback finishes and cancels obsolete requests', async () => {
    const previous = new Subject<DriverPoints[]>();
    results.and.returnValue(previous);
    fixture.detectChanges();
    results.and.returnValue(of([]));
    const fallback = new Subject<typeof driverPointsFixture.driver[]>();
    drivers.and.returnValue(fallback);
    fixture.componentRef.setInput('season', { ...driverPointsFixture.driver.season, number: 2 });
    await render();
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    previous.next(standings);
    fallback.next([driverPointsFixture.driver]);
    fixture.detectChanges();
    expect(rows().length).toBe(1);
    expect(rows()[0].querySelector('.points-score strong')?.textContent).toBe('0');
  });

  it('handles points errors with the existing fallback and finishes after driver errors', async () => {
    results.and.returnValue(throwError(() => new Error('offline')));
    drivers.and.returnValue(throwError(() => new Error('offline')));
    await render();
    expect(drivers).toHaveBeenCalled();
    expect(rows().length).toBe(0);
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
  });

  it('renders one native stretched profile link per row and reserved lazy images', async () => {
    await render();
    for (const row of rows()) {
      const links = row.querySelectorAll<HTMLAnchorElement>('a');
      expect(links.length).toBe(1);
      const link = links[0];
      expect(link.getAttribute('href')).toBe('/drivers/' + (row.querySelector('h3')!.textContent!.replace('Ver perfil de ', '').replaceAll(' ', '_')) + '?season=' + fixture.componentInstance.season().number);
      expect(link.hasAttribute('aria-label')).toBeFalse();
      expect(link.querySelector('.sr-only')?.textContent).toBe('Ver perfil de ');
      expect(row.querySelectorAll('button, input, select, textarea, [tabindex], [contenteditable="true"]')).toHaveSize(0);
      expect(row.querySelector('.profile-desktop')?.getAttribute('aria-hidden')).toBe('true');
      expect(row.querySelector('.profile-desktop')?.textContent?.trim()).toBe('');
      expect(row.querySelector('.profile-desktop .profile-indicator .pi-arrow-right')).not.toBeNull();
      expect(row.querySelector('.p-button')).toBeNull();
      expect(row.querySelector('.profile-mobile')?.getAttribute('aria-hidden')).toBe('true');
    }
    for (const image of Array.from(rows()[0].querySelectorAll('img'))) {
      expect(image.loading).toBe('lazy');
      expect(image.getAttribute('width')).toBeTruthy();
      expect(image.getAttribute('height')).toBeTruthy();
    }
  });

  it('includes the selected historical season in the native profile href', async () => {
    fixture.componentRef.setInput('season', { ...driverPointsFixture.driver.season, number: 2 });
    await render();
    expect(rows()[0].querySelector('a')?.getAttribute('href')).toBe('/drivers/Piloto_de_prueba?season=2');
  });

  it('gives only default silhouettes a light circular background in both themes', async () => {
    results.and.returnValue(of([
      { ...standings[0], driver: { ...standings[0].driver, driverImage: 'drivers/default/default.webp' } },
      { ...standings[1], driver: { ...standings[1].driver, driverImage: 'drivers/real/photo.webp' } }
    ]));
    await render();
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    try {
      for (const dark of [false, true]) {
        root.classList.toggle('dark', dark);
        const silhouette = rows()[0].querySelector<HTMLElement>('.driver-photo')!;
        const photo = rows()[1].querySelector<HTMLElement>('.driver-photo')!;
        expect(silhouette.classList.contains('default-driver-photo')).toBeTrue();
        expect(photo.classList.contains('default-driver-photo')).toBeFalse();
        expect(getComputedStyle(silhouette).backgroundColor).toBe('rgb(233, 236, 239)');
        expect(getComputedStyle(photo).backgroundColor).not.toBe('rgb(233, 236, 239)');
        expect(parseFloat(getComputedStyle(silhouette).borderRadius)).toBeGreaterThanOrEqual(silhouette.getBoundingClientRect().width / 2);
        const [r, g, b] = getComputedStyle(silhouette).backgroundColor.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        expect((0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05) / 0.05)
          .withContext('black silhouette against its background, dark=' + dark).toBeGreaterThanOrEqual(3);
      }
    } finally { root.classList.toggle('dark', wasDark); }
  });

  it('labels the driver number for sighted and screen reader users', async () => {
    results.and.returnValue(of([{ ...standings[0], driver: { ...standings[0].driver, number: 88 } }]));
    await render();
    const number = rows()[0].querySelector('.driver-number')!;
    expect(number.textContent).toBe('Número #88');
    expect(number.querySelector('.sr-only')?.textContent).toBe('Número ');
    expect(number.querySelector('[aria-hidden="true"]')?.textContent).toBe('#');
  });

  it('detects only vacancy names with the exported pure predicate', () => {
    for (const name of ['Vacante', 'vacante2', 'VACANTE3', 'Vacante0']) {
      expect(isVacantDriver({ ...standings[0].driver, name })).withContext(name).toBeTrue();
    }
    for (const name of ['Vacante piloto', 'Piloto Vacante', 'Vacantes', 'Vacante-2']) {
      expect(isVacantDriver({ ...standings[0].driver, name })).withContext(name).toBeFalse();
    }
  });

  it('separates muted vacancies without links or standings metrics and filters their teams', async () => {
    const vacant = ['Vacante', 'Vacante2', 'Vacante3'].map((name, index) => ({
      ...standings[index], driver: { ...standings[index].driver, id: 10 + index, name, number: 0 }, totalPoints: 0
    }));
    results.and.returnValue(of([vacant[0], ...standings, ...vacant.slice(1)]));
    await render();
    expect(rows()).toHaveSize(3);
    expect(rows()[0].getAttribute('value')).toBe('1');
    expect(rows()[0].querySelector('.points-track > div')?.getAttribute('style')).toContain('100%');
    const zone = fixture.nativeElement.querySelector('.vacancies') as HTMLElement;
    expect(zone.compareDocumentPosition(fixture.nativeElement.querySelector('ol')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    const vacancies = Array.from(zone.querySelectorAll<HTMLElement>('.vacancy-row'));
    expect(vacancies).toHaveSize(3);
    for (const row of vacancies) {
      expect(row.textContent).toContain('Vacante');
      expect(row.textContent).not.toMatch(/Vacante\d/);
      expect(row.querySelector('p')?.textContent).toBe('Vacante');
      expect(row.classList.contains('text-ink-soft')).toBeTrue();
      expect(Number(getComputedStyle(row).opacity)).toBeLessThan(1);
      expect(Number(getComputedStyle(row.querySelector('img')!).opacity)).toBeLessThan(1);
      expect(row.hasAttribute('value')).toBeFalse();
      expect(row.querySelector('a, button, [tabindex], .rank-position, .points-track, .points-score, .points-gap, .position-change, .pi-arrow-right')).toBeNull();
      expect(row.querySelector('img')?.getAttribute('loading')).toBe('lazy');
      expect(getComputedStyle(row.querySelector('img')!).borderTopWidth).toBe('1px');
    }
    fixture.componentRef.setInput('selectedTeams', ['Red Bull']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.vacancy-row')).toHaveSize(1);
    expect(fixture.nativeElement.querySelector('.vacancy-row').textContent).toContain('Red Bull');
    fixture.componentRef.setInput('selectedTeams', ['Equipo ausente']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.vacancies')).toBeNull();
  });

  it('omits the vacancy section when there are no vacancies', async () => {
    await render();
    expect(fixture.nativeElement.querySelector('.vacancies')).toBeNull();
  });

  it('calculates competition positions from real drivers, independently of order', () => {
    const tied = [100, 80, 60, 60, 20].map((totalPoints, index) => ({
      ...standings[0], totalPoints, driver: { ...standings[0].driver, id: index + 1 }
    }));
    const withVacancy = [{ ...standings[0], driver: { ...standings[0].driver, name: 'Vacante' }, totalPoints: 1000 }, ...tied].reverse();
    expect(tied.map(point => driverPosition(point, withVacancy))).toEqual([1, 2, 3, 3, 5]);
  });

  it('renders only position numbers visibly and labels ties for screen readers before team filtering', async () => {
    const tied = [100, 80, 60, 60, 20].map((totalPoints, index) => ({
      ...standings[index % standings.length], totalPoints, driver: { ...standings[index % standings.length].driver, id: index + 1 }
    }));
    results.and.returnValue(of(tied));
    await render();
    expect(rows().map(row => Number(row.getAttribute('value')))).toEqual([1, 2, 3, 3, 5]);
    expect(fixture.nativeElement.querySelector('.tie-marker')).toBeNull();
    for (const [index, row] of rows().entries()) {
      const rank = row.querySelector<HTMLElement>('.rank-position')!;
      expect(visibleRankText(rank)).toBe(['01', '02', '03', '03', '05'][index]);
      if ([2, 3].includes(index)) {
        expect(rank.querySelector('.sr-only')?.textContent).toBe(' empatado');
      } else {
        expect(rank.querySelector('.sr-only')).toBeNull();
      }
    }
    expect(rows()[0].querySelector('.tie-marker')).toBeNull();
    fixture.componentRef.setInput('selectedTeams', ['Red Bull']);
    fixture.detectChanges();
    expect(rows().map(row => Number(row.getAttribute('value')))).toEqual([2, 5]);
  });

  it('gives gold to every tied leader and excludes vacancies from ties even at zero points', async () => {
    results.and.returnValue(of([
      ...standings.slice(0, 2).map(point => ({ ...point, totalPoints: 0 })),
      { ...standings[2], driver: { ...standings[2].driver, name: 'Vacante3' }, totalPoints: 0 }
    ]));
    await render();
    expect(rows()).toHaveSize(2);
    for (const row of rows()) {
      expect(row.getAttribute('value')).toBe('1');
      expect(row.querySelector('.rank-position.text-podium-1')).not.toBeNull();
      expect(row.querySelector('.tie-marker')).toBeNull();
      expect(visibleRankText(row.querySelector('.rank-position')!)).toBe('01');
      expect(row.querySelector('.rank-position .sr-only')?.textContent).toBe(' empatado');
      expect(row.querySelector('.points-gap')?.textContent).toBe('');
    }
  });

  it('does not tie a sole zero-point driver with vacant seats', async () => {
    results.and.returnValue(of([
      { ...standings[0], totalPoints: 0 },
      { ...standings[1], driver: { ...standings[1].driver, name: 'Vacante2' }, totalPoints: 0 }
    ]));
    await render();
    expect(rows()[0].querySelector('.tie-marker')).toBeNull();
    expect(rows()[0].querySelector('.rank-position .sr-only')).toBeNull();
  });

  for (const points of [[100, 80, 60, 20], [100, 80, 80, 20], [100, 80, 60, 60, 20]]) {
    it('uses podium classes by competition position for ' + points.join(','), async () => {
      results.and.returnValue(of(points.map((totalPoints, index) => ({
        ...standings[0], totalPoints, driver: { ...standings[0].driver, id: index + 1 }
      }))));
      await render();
      for (const row of rows()) {
        const position = Number(row.getAttribute('value'));
        const rank = row.querySelector('.rank-position')!;
        expect(rank.classList.contains('text-accent-text')).toBeFalse();
        for (const podium of [1, 2, 3]) {
          expect(rank.classList.contains('text-podium-' + podium)).withContext('position ' + position).toBe(position === podium);
        }
      }
    });
  }

  it('aligns point numbers and reserves separate gap columns in mobile and desktop iframes', async () => {
    results.and.returnValue(of([200, 135, 0].map((totalPoints, index) => ({
      ...standings[0], totalPoints, driver: { ...standings[0].driver, id: index + 1 }
    }))));
    await render();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');
    const frame = document.createElement('iframe');
    frame.style.cssText = 'height:400px;border:0';
    document.body.append(frame);
    try {
      const doc = frame.contentDocument!;
      doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + fixture.nativeElement.outerHTML + '</body>';
      for (const width of [320, 375, 390, 767, 768, 1024, 1920]) {
        frame.style.width = width + 'px';
        const numbers = Array.from(doc.querySelectorAll<HTMLElement>('.points-score strong'));
        const leaderRight = numbers[0].getBoundingClientRect().right;
        for (const number of numbers) {
          expect(Math.abs(number.getBoundingClientRect().right - leaderRight)).withContext('points/' + width).toBeLessThanOrEqual(0.5);
          expect(frame.contentWindow!.getComputedStyle(number).fontVariantNumeric).toBe('tabular-nums');
        }
        const gaps = Array.from(doc.querySelectorAll<HTMLElement>('.points-gap'));
        expect(gaps[0].textContent).toBe('');
        expect(gaps[0].getBoundingClientRect().width).toBeGreaterThan(0);
        for (const [index, gap] of gaps.entries()) {
          expect(gap.parentElement).toBe(numbers[index].closest<HTMLElement>('.ranking-row'));
          expect(gap.getBoundingClientRect().left).toBeGreaterThanOrEqual(numbers[index].getBoundingClientRect().right);
          expect(gap.getBoundingClientRect().width).toBe(gaps[0].getBoundingClientRect().width);
          const original = gap.textContent;
          gap.textContent = '-999';
          expect(gap.scrollWidth).toBeLessThanOrEqual(gap.clientWidth);
          gap.textContent = original;
        }
        expect(doc.documentElement.scrollWidth).withContext('overflow/' + width).toBeLessThanOrEqual(width);
      }
      const overflowingWidths: number[] = [];
      let maximumMisalignment = 0;
      const numbers = Array.from(doc.querySelectorAll<HTMLElement>('.points-score strong'));
      for (let width = 320; width <= 1920; width++) {
        frame.style.width = width + 'px';
        if (doc.documentElement.scrollWidth > width) overflowingWidths.push(width);
        const leaderRight = numbers[0].getBoundingClientRect().right;
        maximumMisalignment = Math.max(maximumMisalignment, ...numbers.map(number => Math.abs(number.getBoundingClientRect().right - leaderRight)));
      }
      expect(overflowingWidths).withContext('every integer viewport from 320 to 1920px').toEqual([]);
      expect(maximumMisalignment).withContext('every integer viewport from 320 to 1920px').toBeLessThanOrEqual(0.5);
      console.info('DRIVERS_POINTS: 1601 viewport widths, maximum misalignment=' + maximumMisalignment + 'px; overflowing widths=' + overflowingWidths.length);
    } finally { frame.remove(); }
  }, 15000);
});
