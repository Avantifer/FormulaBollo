import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Select } from 'primeng/select';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { Season } from '../../../../shared/models/season';
import { StatisticsHeadToHead, StatisticsOverview } from '../../../../shared/models/statistics';
import { CacheService } from '../../../../shared/services/cache.service';
import { StatisticsApiService } from '../../../../shared/services/api/statistics-api.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { headToHeadFixture, statisticsFixture } from '../statistics.fixture';
import { mixHex } from './comparative-stats.helpers';
import { ComparativeStatsComponent } from './comparative-stats.component';

describe('ComparativeStatsComponent', () => {
  let fixture: ComponentFixture<ComparativeStatsComponent>;
  let component: ComparativeStatsComponent;
  let http: HttpTestingController;
  let originalDark: boolean;
  const root = (): HTMLElement => fixture.nativeElement;
  const render = (): void => { fixture.detectChanges(); fixture.detectChanges(); };
  const headRequest = () => http.expectOne(request => request.url.endsWith('/statistics/headToHead'));
  const flushDuel = (duel?: StatisticsHeadToHead): void => {
    const request = headRequest();
    const { params } = request.request;
    request.flush(duel ?? headToHeadFixture(Number(params.get('season')), params.get('a')!, params.get('b')!));
    render();
  };
  const load = (data = statisticsFixture(3), duel = true): StatisticsOverview => {
    render();
    const request = http.expectOne(request => request.url.endsWith('/statistics/overview'));
    expect(request.request.params.get('season')).toBe(String(data.season));
    request.flush(data);
    render();
    if (duel && component['selectedIds']().length === 2 && !component['isTeams']()) flushDuel();
    return data;
  };
  const choose = (id: number, side: number): void => {
    fixture.debugElement.queryAll(By.css('p-select'))[side].triggerEventHandler('ngModelChange', id);
    render();
  };
  const teams = (): void => { fixture.componentRef.setInput('typeSelected', 'Equipos'); render(); };

  beforeEach(() => {
    originalDark = document.documentElement.classList.contains('dark');
    TestBed.configureTestingModule({ imports: [ComparativeStatsComponent], providers: provideComponentTesting() });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(ThemeService).setDarkTheme(false);
    fixture = TestBed.createComponent(ComparativeStatsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('seasonSelected', new Season(3, 'Temporada 3', 3));
    fixture.componentRef.setInput('typeSelected', 'Pilotos');
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    TestBed.inject(CacheService).clearCache();
    document.documentElement.classList.toggle('dark', originalDark);
  });

  it('uses solid borders and circle/square legend marks for different teams throughout the tab', () => {
    load();
    expect(component['sameColor']()).toBeFalse();
    expect(component['markColors']()).toEqual(component['selected']().map(entry => entry.color));
    expect(root().querySelector('.legend')!.textContent).not.toMatch(/discontinuo|contorno|relleno continuo|tono apagado/);
    for (const element of Array.from(root().querySelectorAll('*'))) {
      for (const pseudo of [null, '::before', '::after']) {
        const style = getComputedStyle(element, pseudo);
        for (const property of ['border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style', 'outline-style']) {
          expect(style.getPropertyValue(property)).withContext(element.className + '/' + property).not.toMatch(/dashed|dotted/);
        }
      }
    }
    expect(component['chart']().data.datasets.map(dataset => dataset.borderDash)).toEqual([[], []]);
    const [a, b] = Array.from(root().querySelectorAll('.chart-values .swatch'));
    expect(getComputedStyle(a).borderRadius).toBe('50%');
    expect(getComputedStyle(b).borderRadius).toBe('0px');
    const losing = root().querySelector<HTMLElement>('[data-metric="totalPoints"] .metric-fill-b')!;
    expect(losing.style.getPropertyValue('--team-color')).toBe(component['selected']()[1].color);
  });

  it('requests duels with selected driver names while keeping selection by ID', () => {
    const data = statisticsFixture(3);
    data.drivers[0].driver.id = 50;
    data.drivers[1].driver.id = 52;
    load(data, false);
    expect(component['selectedIds']()).toEqual([50, 52]);
    const request = http.expectOne(request => request.url.endsWith('/statistics/headToHead')
      && request.params.get('season') === '3'
      && request.params.get('a') === 'Piloto 01'
      && request.params.get('b') === 'Piloto 02');
    const response = headToHeadFixture();
    request.flush(response);
    render();
    expect(component['duel']()).toEqual(response);
    choose(3, 1);
    const changed = http.expectOne(request => request.url.endsWith('/statistics/headToHead')
      && request.params.get('a') === 'Piloto 01'
      && request.params.get('b') === 'Piloto 03');
    changed.flush(headToHeadFixture(3, 'Piloto 01', 'Piloto 03'));
    render();
    expect(component['selectedIds']()).toEqual([50, 3]);
  });

  it('selects the first two by season points and name, excluding every vacant entry', () => {
    const data = statisticsFixture(3);
    data.drivers[0].driver.name = 'Zeta';
    data.drivers[1].driver.name = 'Alfa';
    data.drivers[1].totalPoints = 1000;
    data.drivers[12].totalPoints = 99999;
    data.drivers.reverse();
    load(data);
    expect(component['selectedIds']()).toEqual([2, 1]);
    expect(component['candidates']().length).toBe(12);
    expect(component['selected']().map(entry => entry.rank)).toEqual([1, 2]);
    expect(Array.from(root().querySelectorAll('.contender .rank')).map(rank => rank.textContent?.trim())).toEqual(['1.º en la temporada', '2.º en la temporada']);
    expect(root().textContent).not.toMatch(/vacante/i);
    expect(root().querySelectorAll('.avatar').length).toBe(2);
    expect(root().querySelector('.points')!.textContent).toContain('1000');
  });

  it('provides filtered accessible selectors with name/team options and a native swap button', () => {
    load();
    const controls = fixture.debugElement.queryAll(By.directive(Select)).map(element => element.componentInstance as Select);
    expect(controls.length).toBe(2);
    expect(controls.map(control => control.ariaLabel)).toEqual(['Cambiar piloto A', 'Cambiar piloto B']);
    expect(controls.every(control => control.filter)).toBeTrue();
    expect(controls[0].filterBy).toBe('name,team');
    expect(controls[0].options!.length).toBe(12);
    expect(controls[0].options![0]).toEqual(jasmine.objectContaining({ name: 'Piloto 01', team: 'McLaren' }));
    const swap = root().querySelector<HTMLButtonElement>('.swap-button')!;
    expect(swap.type).toBe('button');
    expect(swap.textContent).toContain('Intercambiar');
    swap.click();
    render();
    expect(component['selectedIds']()).toEqual([2, 1]);
    const request = headRequest();
    expect(request.request.params.get('a')).toBe('Piloto 02');
    expect(request.request.params.get('b')).toBe('Piloto 01');
    request.flush(headToHeadFixture(3, 'Piloto 02', 'Piloto 01'));
    render();
    expect(root().querySelector('[aria-live="polite"]')!.textContent).toBe('Comparando Piloto 02 con Piloto 01');
  });

  it('swaps a duplicate choice on either side and permits an independent new choice', () => {
    load();
    choose(2, 0);
    expect(component['selectedIds']()).toEqual([2, 1]);
    flushDuel();
    choose(2, 1);
    expect(component['selectedIds']()).toEqual([1, 2]);
    http.expectNone(request => request.url.endsWith('/statistics/headToHead'));
    choose(3, 1);
    expect(component['selectedIds']()).toEqual([1, 3]);
    flushDuel();
    choose(1, 0);
    component['select'](999, 0);
    expect(component['selectedIds']()).toEqual([1, 3]);
    http.expectNone(request => request.url.endsWith('/statistics/headToHead'));
  });

  it('shows wrapping name/team options with touch targets and swaps through the actual dropdown', async () => {
    load();
    const control = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    control.show();
    render();
    await fixture.whenStable();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    render();
    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
    expect(options.length).toBe(12);
    const option = options.find(option => option.textContent!.includes('Piloto 02'))!;
    expect(option.textContent).toContain('Mercedes');
    expect(getComputedStyle(option.querySelector('.select-option')!).whiteSpace).toBe('normal');
    expect(option.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    option.click();
    render();
    expect(component['selectedIds']()).toEqual([2, 1]);
    flushDuel();
  });

  it('resets to the first two on season/type changes and shares one overview per season', () => {
    const data = load();
    choose(5, 0);
    flushDuel();
    teams();
    expect(component['selectedIds']()).toEqual([1, 2]);
    choose(4, 1);
    expect(component['selectedIds']()).toEqual([1, 4]);
    fixture.componentRef.setInput('typeSelected', 'Pilotos');
    render();
    expect(component['selectedIds']()).toEqual([1, 2]);
    http.expectNone(request => request.url.endsWith('/statistics/overview') || request.url.endsWith('/statistics/headToHead'));
    TestBed.inject(StatisticsApiService).getOverview(3).subscribe(cached => expect(cached).toEqual(data));
    http.expectNone(request => request.url.endsWith('/statistics/overview'));
    fixture.componentRef.setInput('seasonSelected', new Season(2, 'Temporada 2', 2));
    load(statisticsFixture(2));
    expect(component['selectedIds']()).toEqual([1, 2]);
    expect(component['overview']()!.season).toBe(2);
  });

  it('cancels old overview and duel responses on season/selection changes and destruction', () => {
    render();
    const overview = http.expectOne(request => request.url.endsWith('/statistics/overview'));
    fixture.componentRef.setInput('seasonSelected', new Season(2, 'Temporada 2', 2));
    render();
    expect(overview.cancelled).toBeTrue();
    load(statisticsFixture(2), false);
    const previous = headRequest();
    choose(3, 0);
    expect(previous.cancelled).toBeTrue();
    expect(() => previous.flush(headToHeadFixture(2))).toThrowError(/cancelled/i);
    const pending = headRequest();
    teams();
    expect(pending.cancelled).toBeTrue();
    fixture.componentRef.setInput('typeSelected', 'Pilotos');
    render();
    const next = headRequest();
    fixture.componentRef.setInput('seasonSelected', new Season(1, 'Temporada 1', 1));
    render();
    expect(next.cancelled).toBeTrue();
    const last = http.expectOne(request => request.url.endsWith('/statistics/overview'));
    fixture.destroy();
    expect(last.cancelled).toBeTrue();
  });

  it('cancels a pending duel when the component is destroyed', () => {
    load(statisticsFixture(3), false);
    const request = headRequest();
    fixture.destroy();
    expect(request.cancelled).toBeTrue();
  });

  it('renders solid result-colored bars and bold winners, including lower-is-better, ties and missing data', () => {
    const data = statisticsFixture(3);
    data.drivers[0].victories = data.drivers[1].victories;
    load(data);
    const row = (key: string) => root().querySelector<HTMLElement>('[data-metric="' + key + '"]')!;
    expect(root().querySelectorAll('.metric-row').length).toBe(11);
    expect(row('totalPoints').getAttribute('aria-label')).toBe('Puntos: Piloto 01 1000, Piloto 02 970. Gana Piloto 01.');
    expect(row('totalPoints').querySelector<HTMLElement>('.metric-fill-b')!.style.width).toBe('97%');
    expect(row('poles').querySelector<HTMLElement>('.metric-fill-a')!.style.width).toBe('50%');
    expect(row('poles').querySelector<HTMLElement>('.metric-fill-b')!.style.width).toBe('100%');
    expect(row('penalties').querySelector('.metric-value-b.win')!.textContent).toContain('19');
    expect(row('penalties').getAttribute('aria-label')).toContain('Gana Piloto 02.');
    expect(row('posStd').querySelector('.metric-value.win')!.textContent).toContain('1,0');
    expect(row('victories').textContent).toContain('= Empate');
    expect(row('victories').getAttribute('aria-label')).toContain('. Empate.');
    expect(row('victories').querySelectorAll('.result-color').length).toBe(2);
    expect(row('victories').querySelector('.win')).toBeNull();
    expect(row('totalPoints').querySelector('.metric-fill-a.result-color')).not.toBeNull();
    expect(row('totalPoints').querySelector('.metric-fill-b.result-color')).toBeNull();
    expect(row('penalties').querySelector('.metric-fill-a.result-color')).toBeNull();
    expect(row('penalties').querySelector('.metric-fill-b.result-color')).not.toBeNull();
    expect(root().querySelector('.duel-metrics .check')).toBeNull();
    expect(root().textContent).not.toContain('✓');
    expect(root().textContent).not.toContain('Mejor cifra');
    const legend = root().querySelector('.metric-legend')!;
    expect(legend.textContent).toContain('Gana la fila: color de equipo');
    expect(legend.textContent).toContain('Pierde la fila: color apagado');
    expect(legend.textContent).toContain('= empate');
    expect(legend.querySelectorAll('.metric-key').length).toBe(2);
    expect(Array.from(row('totalPoints').querySelectorAll('.track')).every(track => track.getAttribute('aria-hidden') === 'true')).toBeTrue();
    choose(4, 0);
    flushDuel();
    expect(row('posStd').textContent).toContain('—');
    expect(row('posStd').getAttribute('aria-label')).toContain('. Sin dato suficiente.');
    expect(row('posStd').querySelector<HTMLElement>('.metric-fill-a')!.style.width).toBe('0%');
    expect(row('posStd').querySelectorAll('.result-color, .win').length).toBe(0);
    component['swap']();
    render();
    flushDuel();
    expect(row('posStd').querySelector<HTMLElement>('.metric-fill-b')!.style.width).toBe('0%');
    expect(row('posStd').querySelectorAll('.result-color, .win').length).toBe(0);
  });

  it('uses full and muted team colors for teammates with accessible contrast in both themes', () => {
    const data = statisticsFixture(3);
    data.drivers[1].driver.team = data.drivers[0].driver.team;
    data.drivers[0].victories = data.drivers[1].victories;
    load(data);
    const rgb = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (color: string) => rgb(color).map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
    const resolved = (color: string) => {
      const probe = document.createElement('span');
      probe.style.color = color;
      root().append(probe);
      const result = getComputedStyle(probe).color;
      probe.remove();
      return result;
    };
    for (const dark of [false, true]) {
      TestBed.inject(ThemeService).setDarkTheme(dark);
      render();
      const panel = getComputedStyle(root().querySelector('.duel-metrics')!).backgroundColor;
      const gray = resolved('var(--sector-flat)');
      const ink = resolved('var(--ink)'), soft = resolved('var(--ink-soft)');
      expect(contrast(gray, panel)).withContext('gray/panel, dark=' + dark).toBeGreaterThanOrEqual(3);
      expect(contrast(soft, panel)).withContext('ink-soft/panel, dark=' + dark).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, panel)).withContext('ink/panel, dark=' + dark).toBeGreaterThanOrEqual(4.5);
      const [a, b] = component['selected']();
      expect(a.color).toBe(b.color);
      for (const metric of component['metrics']()) {
        const row = root().querySelector('[data-metric="' + metric.key + '"]')!;
        for (const [index, side] of ['A', 'B'].entries()) {
          const bar = row.querySelector<HTMLElement>(index ? '.metric-fill-b' : '.metric-fill-a')!;
          const style = getComputedStyle(bar);
          const colored = metric.winner === side || metric.winner === '=';
          expect(style.backgroundColor).withContext(metric.key + '/' + side).toBe(colored ? resolved(index ? b.color : a.color) : resolved('color-mix(in srgb, ' + (index ? b.color : a.color) + ' 35%, var(--sector-flat))'));
          expect(style.backgroundImage).toBe('none');
          expect(style.borderWidth).toBe('0px');
          expect(style.borderStyle).not.toContain('dashed');
          expect(getComputedStyle(bar, '::before').content).toBe('none');
          expect(getComputedStyle(bar, '::after').content).toBe('none');
          const value = row.querySelectorAll('.metric-value')[index];
          expect(getComputedStyle(value).fontWeight).toBe(metric.winner === side ? '700' : '400');
          expect(getComputedStyle(value).color).toBe(metric.winner === side ? ink : soft);
        }
      }
      expect(getComputedStyle(root().querySelector('.metric-key-flat')!, '::before').backgroundColor).toBe(resolved('color-mix(in srgb, ' + a.color + ' 35%, var(--sector-flat))'));
      const muted = mixHex(b.color, component['palette']().flat);
      expect(muted).not.toBe(b.color);
      expect(resolved(muted)).not.toBe(gray);
      expect(getComputedStyle(root().querySelector('.contender-b')!).borderTopColor).toBe(resolved(muted));
      expect(getComputedStyle(root().querySelector('.fill-b')!).backgroundColor).toBe(resolved(muted));
      expect(getComputedStyle(root().querySelector('.race-b')!).borderTopColor).toBe(resolved(muted));
      expect(getComputedStyle(root().querySelector('.key-b')!, '::before').backgroundColor).toBe(resolved(muted));
      expect(getComputedStyle(root().querySelector('.contender-b')!).borderTopStyle).toBe('solid');
      expect(getComputedStyle(root().querySelector('.result-bar .fill-b')!).borderTopStyle).toBe('solid');
    }
  });

  for (const [aheadA, aheadB, comparable, headline] of [
    [2, 1, 3, 'Piloto 01 adelanta a Piloto 02 en 2 de 3 carreras comunes'],
    [1, 2, 3, 'Piloto 02 adelanta a Piloto 01 en 2 de 3 carreras comunes'],
    [1, 1, 3, 'Piloto 01 y Piloto 02 van igualados: 1-1 en 3 carreras comunes'],
    [0, 0, 0, 'No hay carreras comunes con resultado comparable.']
  ] as const) {
    it('renders the headline, A-B score and split bar for ' + aheadA + '/' + aheadB + '/' + comparable, () => {
      load(statisticsFixture(3), false);
      flushDuel({ ...headToHeadFixture(), aheadA, aheadB, comparable });
      expect(root().querySelector('.duel-headline')!.textContent).toBe(headline);
      expect(root().querySelector('.score')!.textContent!.trim()).toBe(aheadA + ' - ' + aheadB);
      expect(component['split']()[0]).toBe(comparable ? aheadA / comparable * 100 : 0);
      expect(component['split']()[2]).toBe(comparable ? (comparable - aheadA - aheadB) / comparable * 100 : 0);
      expect(root().querySelector('.versus .help')!.textContent).toContain('1 excluidas por doble abandono');
    });
  }

  it('calculates constructor duels locally, renders per-race points, team labels and D2 rows', () => {
    fixture.componentRef.setInput('typeSelected', 'Equipos');
    const data = statisticsFixture(3);
    data.teamEvolution.series[0].cumulative = [40, 70];
    data.teamEvolution.series[1].cumulative = [25, 75];
    load(data);
    http.expectNone(request => request.url.endsWith('/statistics/headToHead'));
    expect(component['duel']()).toEqual(jasmine.objectContaining({ aheadA: 1, aheadB: 1, comparable: 2 }));
    expect(root().querySelectorAll('.metric-row').length).toBe(12);
    expect(root().textContent).toContain('Doble puntuación');
    expect(root().textContent).toContain('Fiabilidad');
    expect(root().querySelector('.race-a')!.textContent).toContain('40 pts');
    expect(root().querySelector('.race-b')!.textContent).toContain('50 pts');
    expect(root().querySelector('.race-grid')!.textContent).not.toContain('DNF');
    const controls = fixture.debugElement.queryAll(By.directive(Select)).map(element => element.componentInstance as Select);
    expect(controls[1].ariaLabel).toBe('Cambiar escuderia B');
  });

  it('shows skeletons during overview and duel loading, without hiding the chart while the duel loads', () => {
    render();
    expect(root().querySelectorAll('p-skeleton').length).toBe(4);
    expect(root().querySelector('[aria-busy="true"]')).not.toBeNull();
    load(statisticsFixture(3), false);
    expect(root().querySelector('.duel-skeleton p-skeleton')).not.toBeNull();
    expect(root().querySelector('p-chart')).not.toBeNull();
    flushDuel();
    expect(root().querySelector('p-skeleton')).toBeNull();
  });

  it('isolates duel errors and retries in that zone while retaining metrics, chart and selection', () => {
    load(statisticsFixture(3), false);
    headRequest().flush({}, { status: 500, statusText: 'Error' });
    render();
    const error = root().querySelector('.duel-error')!;
    expect(error.textContent).toContain('No se pudo cargar el cara a cara.');
    expect(root().querySelectorAll('.metric-row').length).toBe(11);
    expect(root().querySelector('p-chart')).not.toBeNull();
    expect(root().querySelector('.race-grid')).toBeNull();
    error.querySelector<HTMLButtonElement>('button')!.click();
    render();
    flushDuel();
    expect(root().querySelector('.duel-error')).toBeNull();
    expect(root().querySelector('.race-grid')).not.toBeNull();
    expect(component['selectedIds']()).toEqual([1, 2]);
    http.expectNone(request => request.url.endsWith('/statistics/overview'));
  });

  it('shows an overview error with a working retry and no partial comparison', () => {
    render();
    http.expectOne(request => request.url.endsWith('/statistics/overview')).flush({}, { status: 500, statusText: 'Error' });
    render();
    expect(root().querySelector('[role="alert"]')!.textContent).toContain('No se pudieron cargar las estadísticas.');
    expect(root().querySelector('.hero')).toBeNull();
    root().querySelector<HTMLButtonElement>('.retry-button')!.click();
    load();
    expect(root().querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an empty state for fewer than two non-vacant drivers and teams, without requesting a duel', () => {
    const data = statisticsFixture(3);
    data.drivers = [data.drivers[0], data.drivers[12]];
    data.teams = [];
    load(data);
    expect(root().querySelector('[role="status"]')!.textContent).toBe('No hay suficientes participantes para comparar en esta temporada.');
    teams();
    expect(root().querySelector('[role="status"]')).not.toBeNull();
    http.expectNone(request => request.url.endsWith('/statistics/headToHead'));
    expect(root().querySelector('p-select')).toBeNull();
  });

  it('renders chronological race cells, DNF, winners and solid borders', () => {
    load();
    const cells = Array.from(root().querySelectorAll<HTMLElement>('.race-cell'));
    expect(cells.length).toBe(4);
    expect(cells.map(cell => cell.querySelector('.race-label > span')!.textContent)).toEqual(['MEL', 'SHA', 'SUZ', 'BAH']);
    expect(cells[0].textContent).toContain('DNF');
    expect(cells[0].classList.contains('race-a')).toBeTrue();
    expect(cells[1].classList.contains('race-b')).toBeTrue();
    expect(getComputedStyle(cells[0]).borderTopStyle).toBe('solid');
    expect(getComputedStyle(cells[1]).borderTopStyle).toBe('solid');
    expect(cells[2].textContent).toContain('×');
    expect(cells[3].textContent).toContain('=');
    expect(cells[0].getAttribute('aria-label')).toBe('Melbourne: A P1, B DNF; resultado A');
  });

  it('retains A/B markers for teammates and provides the live announcement and table inside an sr-only div', () => {
    const data = statisticsFixture(3);
    data.drivers[1].driver.team = data.drivers[0].driver.team;
    load(data);
    expect(root().textContent).toContain('Compañeros de equipo');
    expect(root().querySelector('.legend')!.textContent).toContain('A · Piloto 01');
    expect(root().querySelector('.legend')!.textContent).toContain('B · Piloto 02 · tono apagado');
    expect(root().querySelector('[aria-live="polite"]')!.textContent).toBe('Comparando Piloto 01 con Piloto 02');
    const table = root().querySelector('div.sr-only > table')!;
    expect(table).not.toBeNull();
    expect(root().querySelector('table.sr-only')).toBeNull();
    expect(table.querySelectorAll('tbody tr').length).toBe(2);
    expect(table.querySelectorAll('thead th').length).toBe(3);
    const [a, b] = component['chart']().data.datasets;
    expect(a.borderColor).not.toBe(b.borderColor);
    expect(b.borderColor).toBe(mixHex(component['selected']()[1].color, component['palette']().flat));
    expect(root().querySelector('.legend')!.textContent).not.toMatch(/discontinuo|contorno|relleno continuo/);
    expect(getComputedStyle(root().querySelector('.key')!, '::before').borderRadius).toBe('50%');
    expect(getComputedStyle(root().querySelector('.key-b')!, '::before').borderRadius).toBe('0px');
    expect(a.borderDash).toEqual([]);
    expect(b.borderDash).toEqual([]);
    expect(a.pointStyle).toBe('circle');
    expect(b.pointStyle).toBe('rect');
  });

  it('changes chart theme from CSS tokens and mobile tick density without requesting data or changing selection', () => {
    load();
    const light = component['chart']().options;
    for (const dark of [true, false]) {
      TestBed.inject(ThemeService).setDarkTheme(dark);
      render();
      const palette = component['palette']();
      expect(component['chart']().options.color).toBe(palette.ink);
      expect(component['chart']().options.plugins!.tooltip).toEqual(jasmine.objectContaining({ backgroundColor: palette.panel, bodyColor: palette.ink }));
      expect(component['chart']().data.datasets[1].pointBackgroundColor).toBe(component['markColors']()[1]);
    }
    expect(component['chart']().options).not.toBe(light);
    component['mobile'].set(true);
    render();
    expect(component['chart']().options.scales!['x']!.ticks!.maxTicksLimit).toBe(6);
    expect(component['selectedIds']()).toEqual([1, 2]);
    http.expectNone(() => true);
  });

  it('uses photo initials when an image fails', () => {
    const data = statisticsFixture(3);
    data.drivers[0].driver.driverImage = 'driver.png';
    load(data);
    const image = root().querySelector<HTMLImageElement>('img.avatar')!;
    image.dispatchEvent(new Event('error'));
    render();
    expect(root().querySelector('img.avatar')).toBeNull();
    expect(root().querySelector('.avatar')!.textContent).toBe('P0');
  });

  it('LAYOUT fits every descendant at 320/390/768/1024/1296px in both themes for drivers, teams and teammates, with 44px mobile targets', async () => {
    const data = statisticsFixture(3);
    data.drivers[0].driver.name = 'Piloto con un nombre muy largo para comparar';
    load(data);
    await fixture.whenStable();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');
    for (const mode of ['drivers', 'teams', 'teammates']) {
      if (mode === 'teams') teams();
      if (mode === 'teammates') {
        data.drivers[1].driver.team = data.drivers[0].driver.team;
        component['overview'].set({ ...data });
        fixture.componentRef.setInput('typeSelected', 'Pilotos');
        render();
      }
      await fixture.whenStable();
      for (const dark of [false, true]) {
        for (const width of [320, 390, 768, 1024, 1296]) {
          const frame = document.createElement('iframe');
          Object.assign(frame.style, { width: width + 'px', height: '1200px', border: '0' });
          document.body.append(frame);
          try {
            const doc = frame.contentDocument!;
            doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body><div class="my-container">' + root().outerHTML + '</div></body>';
            doc.documentElement.classList.toggle('dark', dark);
            const override = doc.createElement('style');
            override.textContent = '* { font-family: Verdana, sans-serif !important; }';
            doc.head.append(override);
            await doc.fonts.ready;
            const view = frame.contentWindow!;
            const context = mode + '/' + (dark ? 'dark' : 'light') + '/' + width;
            expect(doc.documentElement.scrollWidth).withContext(context + '/document').toBeLessThanOrEqual(doc.documentElement.clientWidth);
            const host = doc.querySelector('.my-container')!.firstElementChild!;
            for (const element of Array.from(host.querySelectorAll('*'))) {
              let right = element.getBoundingClientRect().right;
              for (let parent = element.parentElement; parent && host.contains(parent); parent = parent.parentElement) {
                if (view.getComputedStyle(parent).overflowX !== 'visible') right = Math.min(right, parent.getBoundingClientRect().right);
              }
              expect(right).withContext(context + '/' + element.tagName + '/right').toBeLessThanOrEqual(doc.documentElement.clientWidth);
            }
            for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.hero, .contender, .picker, .picker-control, .versus, .metric-row, .card, .chart-container, .race-grid, .race-cell'))) {
              expect(element.scrollWidth).withContext(context + '/' + element.className).toBeLessThanOrEqual(element.clientWidth);
            }
            expect(doc.querySelectorAll('.contender').length).toBe(2);
            expect(doc.querySelectorAll('.race-cell').length).toBeGreaterThan(0);
            expect(doc.querySelector('div.sr-only > table')).not.toBeNull();
            const a = doc.querySelector('.contender')!, b = doc.querySelector('.contender-b')!;
            expect(view.getComputedStyle(a).borderTopStyle).toBe('solid');
            expect(view.getComputedStyle(b).borderTopStyle).toBe('solid');
            if (width < 640) {
              expect(b.getBoundingClientRect().top).toBeGreaterThan(a.getBoundingClientRect().bottom);
              for (const target of Array.from(doc.querySelectorAll<HTMLElement>('button, p-select'))) {
                expect(target.getBoundingClientRect().height).withContext(context + '/touch-height').toBeGreaterThanOrEqual(44);
                expect(target.getBoundingClientRect().width).withContext(context + '/touch-width').toBeGreaterThanOrEqual(44);
              }
            }
          } finally { frame.remove(); }
        }
      }
    }
  }, 30000);
});
