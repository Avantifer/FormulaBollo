import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartData, ChartDataset, ChartOptions } from 'chart.js';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { Season } from '../../../../shared/models/season';
import { StatisticsOverview } from '../../../../shared/models/statistics';
import { StatisticsApiService } from '../../../../shared/services/api/statistics-api.service';
import { CacheService } from '../../../../shared/services/cache.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { statisticsFixture } from '../statistics.fixture';
import { EvolutionChart } from './evolution-stats.charts';
import { EvolutionStatsComponent } from './evolution-stats.component';

describe('EvolutionStatsComponent', () => {
  let fixture: ComponentFixture<EvolutionStatsComponent>;
  let component: EvolutionStatsComponent;
  let http: HttpTestingController;
  let originalDark: boolean;
  const root = (): HTMLElement => fixture.nativeElement;
  const render = (): void => { fixture.detectChanges(); fixture.detectChanges(); };
  const card = (): EvolutionChart => component['chart']();
  const chips = (): HTMLButtonElement[] => Array.from(root().querySelectorAll<HTMLButtonElement>('.comparison-chip'));
  const selected = (): HTMLButtonElement[] => chips().filter(chip => chip.getAttribute('aria-pressed') === 'true');
  const click = (index: number): void => { chips()[index].click(); render(); };
  const teams = (): void => { fixture.componentRef.setInput('typeSelected', 'Equipos'); render(); };
  const load = (data = statisticsFixture(3)): StatisticsOverview => {
    render();
    const request = http.expectOne(request => request.url.endsWith('/statistics/overview'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('season')).toBe(String(data.season));
    request.flush(data);
    render();
    return data;
  };

  beforeEach(() => {
    originalDark = document.documentElement.classList.contains('dark');
    TestBed.configureTestingModule({ imports: [EvolutionStatsComponent], providers: provideComponentTesting() });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(ThemeService).setDarkTheme(false);
    fixture = TestBed.createComponent(EvolutionStatsComponent);
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

  it('requests once per season, shares the overview with teams and uses the application cache', () => {
    const data = load();
    click(0);
    teams();
    fixture.componentRef.setInput('typeSelected', 'Pilotos');
    fixture.componentRef.setInput('seasonSelected', new Season(3, 'Temporada 3', 3));
    render();
    TestBed.inject(StatisticsApiService).getOverview(3).subscribe(cached => expect(cached).toEqual(data));
    http.expectNone(request => request.url.endsWith('/statistics/overview'));
    fixture.componentRef.setInput('seasonSelected', new Season(2, 'Temporada 2', 2));
    load(statisticsFixture(2));
    expect(component['overview']()!.season).toBe(2);
  });

  it('cancels previous seasons and pending requests on destruction', () => {
    render();
    const old = http.expectOne(request => request.params.get('season') === '3');
    fixture.componentRef.setInput('seasonSelected', new Season(2, 'Temporada 2', 2));
    render();
    expect(old.cancelled).toBeTrue();
    expect(() => old.flush(statisticsFixture(3))).toThrowError(/cancelled/i);
    http.expectOne(request => request.params.get('season') === '2').flush(statisticsFixture(2));
    render();
    expect(component['overview']()!.season).toBe(2);
    fixture.componentRef.setInput('seasonSelected', new Season(1, 'Temporada 1', 1));
    render();
    const pending = http.expectOne(request => request.params.get('season') === '1');
    fixture.destroy();
    expect(pending.cancelled).toBeTrue();
  });

  it('offers every non-vacant driver beyond the first eight, sorted by final points and name, with four selected', () => {
    const data = statisticsFixture(3);
    data.driverEvolution.series.reverse();
    data.driverEvolution.series.find(entry => entry.driver.name === 'Vacante')!.cumulative = [9999, 99999];
    load(data);
    expect(chips().length).toBe(12);
    expect(chips().map(chip => chip.textContent!.trim())).toEqual(data.drivers.slice(0, 12).map(entry => entry.driver.name));
    expect(selected().map(chip => chip.textContent!.trim())).toEqual(['Piloto 01', 'Piloto 02', 'Piloto 03', 'Piloto 04']);
    expect(root().textContent).not.toMatch(/vacante/i);
    expect(root().querySelector('[role="img"]')!.getAttribute('aria-label')).toContain('Líder: Piloto 01 con 50 pts');
    expect(root().querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Pilotos a comparar');
    expect(root().textContent).toContain('Elige hasta 6 pilotos para comparar su evolución.');
  });

  it('limits selection to six with native disabled chips and retains at least one', () => {
    load();
    click(4);
    click(5);
    expect(selected().length).toBe(6);
    expect(chips().filter(chip => chip.disabled).length).toBe(6);
    expect(selected().every(chip => !chip.disabled)).toBeTrue();
    expect(root().textContent).toContain('Máximo 6');
    click(6);
    expect(selected().length).toBe(6);
    component['toggle'](7);
    expect(component['selectedIds']().length).toBe(6);
    for (const index of [0, 1, 2, 3, 4]) click(index);
    expect(chips().every(chip => !chip.disabled)).toBeTrue();
    click(5);
    expect(selected().length).toBe(1);
    expect(selected()[0].textContent).toContain('Piloto 06');
  });

  it('restores the first four and assigns distinct dashes in selection order to chips, lines and lists', () => {
    load();
    click(0);
    click(7);
    click(4);
    click(5);
    const datasets = card().data.datasets as ChartDataset<'line'>[];
    expect(datasets.map(dataset => dataset.label)).toEqual(['Piloto 02', 'Piloto 03', 'Piloto 04', 'Piloto 08', 'Piloto 05', 'Piloto 06']);
    expect(new Set(datasets.map(dataset => JSON.stringify(dataset.borderDash))).size).toBe(6);
    for (const chip of selected()) {
      const index = datasets.findIndex(dataset => dataset.label === chip.textContent!.trim());
      expect(chip.querySelector('line')!.getAttribute('stroke')).toBe(String(datasets[index].borderColor));
      const dash = datasets[index].borderDash as number[];
      expect(chip.querySelector('line')!.getAttribute('stroke-dasharray')).toBe(dash.join(' ') || null);
      expect(card().values.find(value => value.label === datasets[index].label)!.dash).toEqual(dash);
    }
    root().querySelector<HTMLButtonElement>('.reset-button')!.click();
    render();
    expect(component['selectedIds']()).toEqual([1, 2, 3, 4]);
    expect(selected().length).toBe(4);
  });

  it('uses pit tokens for selected chips with accessible contrast in both themes and dims disabled chips', () => {
    load();
    const luminance = (color: string): number => color.match(/[\d.]+/g)!.slice(0, 3)
      .map(value => Number(value) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    for (const dark of [false, true]) {
      TestBed.inject(ThemeService).setDarkTheme(dark);
      render();
      const probe = document.createElement('span');
      probe.style.background = 'var(--pit)';
      probe.style.color = 'var(--on-pit)';
      root().append(probe);
      const tokens = getComputedStyle(probe);
      for (const chip of chips().filter(chip => !chip.disabled)) {
        const style = getComputedStyle(chip);
        const levels = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
        expect((levels[0] + .05) / (levels[1] + .05)).toBeGreaterThanOrEqual(4.5);
        if (chip.getAttribute('aria-pressed') === 'true') {
          expect(style.backgroundColor).toBe(tokens.backgroundColor);
          expect(style.color).toBe(tokens.color);
          expect(style.borderStyle).toBe('solid');
        }
      }
      probe.remove();
      component['reset']();
      render();
      click(4);
      click(5);
      expect(chips().filter(chip => chip.disabled).every(chip => Number(getComputedStyle(chip).opacity) === .55)).toBeTrue();
      expect(selected().every(chip => getComputedStyle(chip).opacity === '1')).toBeTrue();
      component['reset']();
      render();
    }
  });

  it('resets for a new season or type, including a type change while a request is pending', () => {
    load();
    click(0);
    teams();
    expect(component['selectedIds']()).toEqual([1, 2, 3, 4]);
    expect(selected().map(chip => chip.textContent!.trim())).toEqual(['McLaren', 'Mercedes', 'Ferrari', 'Red Bull']);
    expect(root().querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Escuderias a comparar');
    expect(root().textContent).toContain('Elige hasta 6 escuderías para comparar su evolución.');
    click(0);
    fixture.componentRef.setInput('seasonSelected', new Season(2, 'Temporada 2', 2));
    render();
    expect(component['selectedIds']()).toEqual([]);
    fixture.componentRef.setInput('typeSelected', 'Pilotos');
    render();
    const data = statisticsFixture(2);
    data.driverEvolution.series[9].cumulative = [70, 100];
    http.expectOne(request => request.params.get('season') === '2').flush(data);
    render();
    expect(component['selectedIds']()).toEqual([10, 1, 2, 3]);
    http.expectNone(request => request.url.endsWith('/statistics/overview'));
  });

  it('renders only cumulative points with its cursor, sorted values, gains and an accessible race table', async () => {
    const data = load();
    await fixture.whenStable();
    expect(root().querySelectorAll('article').length).toBe(1);
    expect(root().querySelectorAll('canvas').length).toBe(1);
    expect(root().querySelector('h3')!.textContent).toBe('Puntos acumulados');
    expect(root().textContent).not.toMatch(/Distancia al líder|Posición en el campeonato/);
    expect(card().data.datasets.map(dataset => dataset.data)).toEqual([[25, 50], [24, 49], [23, 49], [22, 47]]);
    const chart = fixture.debugElement.query(element => element.name === 'p-chart').componentInstance as { data: ChartData; options: ChartOptions; plugins: { id: string }[] };
    expect(chart.data).toBe(card().data);
    expect(chart.options).toBe(card().options);
    expect(chart.plugins.some(plugin => plugin.id === 'evolutionCursor')).toBeTrue();
    const image = root().querySelector('[role="img"]')!;
    expect(image.getAttribute('aria-label')).toContain('Líder: Piloto 01 con 50 pts');
    expect(image.getAttribute('aria-describedby')).toBe(root().querySelector('ul')!.id);
    expect(root().querySelectorAll('.chart-values .swatch').length).toBe(4);
    expect(root().querySelector('.chart-values li')!.textContent).toContain('50 pts');
    expect(root().querySelector('.value-gain')!.textContent).toBe('+25 en la última');
    expect(root().querySelector('.chart-note')!.textContent).toBe('Incluye puntos de carrera, vuelta rápida y sprint. Pasa el cursor o toca el gráfico para ver cada carrera.');
    const table = root().querySelector('div.sr-only > table')!;
    expect(table.querySelector('caption')!.textContent).toBe('Puntos acumulados por carrera de Temporada 3');
    expect(Array.from(table.querySelectorAll('thead th'), cell => cell.textContent)).toEqual(['Carrera', 'Piloto 01', 'Piloto 02', 'Piloto 03', 'Piloto 04']);
    expect(table.querySelectorAll('tbody tr').length).toBe(data.driverEvolution.races.length);
    expect(Array.from(table.querySelectorAll('tbody tr')[0].children, cell => cell.textContent)).toEqual(['Carrera 1 · Carrera A', '25', '24', '23', '22']);
    expect(Array.from(table.querySelectorAll('tbody tr')[1].children, cell => cell.textContent)).toEqual(['Carrera 2 · Carrera B', '50', '49', '49', '47']);
    expect(table.querySelectorAll('th[scope="col"]').length).toBe(5);
    expect(table.querySelectorAll('th[scope="row"]').length).toBe(2);
    click(0);
    click(4);
    expect(card().values.map(value => value.label)).toEqual(['Piloto 02', 'Piloto 03', 'Piloto 04', 'Piloto 05']);
    expect(root().querySelectorAll('thead th').length).toBe(5);
    teams();
    expect(card().data.datasets[0].data).toEqual([50, 100]);
    expect(root().querySelector('thead')!.textContent).toContain('McLaren');
    expect(root().querySelector('tbody td')!.textContent).toBe('50');
    expect(root().querySelector('.value-gain')!.textContent).toBe('+50 en la última');
  });

  it('announces data and selection changes in a persistent polite live region', () => {
    render();
    const live = root().querySelector('[aria-live="polite"]')!;
    expect(live.classList.contains('sr-only')).toBeTrue();
    expect(live.textContent).toBe('Mostrando 0 pilotos');
    http.expectOne(request => request.url.endsWith('/statistics/overview')).flush(statisticsFixture(3));
    render();
    expect(root().querySelector('[aria-live="polite"]')).toBe(live);
    expect(live.textContent).toBe('Mostrando 4 pilotos');
    click(4);
    expect(live.textContent).toBe('Mostrando 5 pilotos');
    click(0);
    expect(live.textContent).toBe('Mostrando 4 pilotos');
  });

  it('shows skeletons, error with retry, then an empty season without charts', () => {
    render();
    expect(root().querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(root().querySelectorAll('p-skeleton').length).toBe(2);
    http.expectOne(request => request.url.endsWith('/statistics/overview')).flush({}, { status: 500, statusText: 'Error' });
    render();
    expect(root().querySelector('[role="alert"]')!.textContent).toContain('No se pudieron cargar las estadísticas.');
    root().querySelector<HTMLButtonElement>('.retry-button')!.click();
    render();
    expect(root().querySelector('[aria-busy="true"]')).not.toBeNull();
    const data = statisticsFixture(3);
    data.summary.finishedRaces = 0;
    data.driverEvolution.races = [];
    data.driverEvolution.series.forEach(entry => entry.cumulative = []);
    data.teamEvolution.races = [];
    http.expectOne(request => request.url.endsWith('/statistics/overview')).flush(data);
    render();
    expect(root().querySelector('[role="status"]')!.textContent).toBe('Todavía no hay carreras disputadas en esta temporada.');
    expect(root().querySelector('article')).toBeNull();
    teams();
    expect(root().querySelector('p-chart')).toBeNull();
  });

  it('handles fewer than four participants and a single finished race', () => {
    const data = statisticsFixture(3);
    data.driverEvolution.races = data.driverEvolution.races.slice(0, 1);
    data.driverEvolution.series = data.driverEvolution.series.slice(0, 1);
    data.driverEvolution.series[0].cumulative = [25];
    load(data);
    expect(selected().length).toBe(1);
    click(0);
    expect(selected().length).toBe(1);
    expect(card().data.datasets[0].data).toEqual([25]);
    expect(root().querySelector('.value-gain')!.textContent).toBe('+25 en la última');
    expect(root().querySelectorAll('tbody tr').length).toBe(1);
  });

  it('rebuilds options from theme tokens without resetting selection or requesting data, and adapts mobile ticks', () => {
    load();
    click(0);
    click(6);
    const ids = [...component['selectedIds']()];
    const light = component['palette']().ink;
    const previous = card().options;
    TestBed.inject(ThemeService).setDarkTheme(true);
    render();
    expect(card().options).not.toBe(previous);
    expect(component['palette']().ink).not.toBe(light);
    expect(component['selectedIds']()).toEqual(ids);
    expect(card().options.color).toBe(component['palette']().ink);
    expect(card().options.scales!['y']!.grid!.color).toBe(component['palette']().rule);
    for (const dark of [false, true]) {
      TestBed.inject(ThemeService).setDarkTheme(dark);
      render();
      const palette = component['palette']();
      expect(card().options.plugins!.tooltip).toEqual(jasmine.objectContaining({
        backgroundColor: palette.panel, borderColor: palette.rule, titleColor: palette.ink, bodyColor: palette.ink
      }));
    }
    component['mobile'].set(true);
    render();
    expect(card().options.scales!['x']!.ticks!.maxTicksLimit).toBe(6);
    expect(selected().length).toBe(4);
    http.expectNone(request => request.url.endsWith('/statistics/overview'));
  });

  it('LAYOUT fits real styles at 320/390/768/1024/1296px in both themes, with wrapping chips and 44px mobile targets', async () => {
    const data = statisticsFixture(3);
    data.driverEvolution.series[0].driver.name = 'Piloto con un nombre muy largo para comparar';
    load(data);
    click(4);
    click(5);
    await fixture.whenStable();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');
    for (const isTeams of [false, true]) {
      if (isTeams) { teams(); click(4); click(5); }
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
            const fontOverride = doc.createElement('style');
            fontOverride.textContent = '* { font-family: Verdana, sans-serif !important; }';
            doc.head.append(fontOverride);
            await doc.fonts.ready;
            const view = frame.contentWindow!;
            const context = (isTeams ? 'teams' : 'drivers') + '/' + (dark ? 'dark' : 'light') + '/' + width;
            expect(doc.documentElement.scrollWidth).withContext(context + '/document').toBeLessThanOrEqual(doc.documentElement.clientWidth);
            const host = doc.querySelector('.my-container')!.firstElementChild!;
            const descendants = host.querySelectorAll('*');
            expect(descendants.length).withContext(context + '/descendants').toBeGreaterThan(0);
            for (const element of Array.from(descendants)) {
              let right = element.getBoundingClientRect().right;
              // Count every descendant, respecting content clipped by its ancestors (including sr-only).
              for (let parent = element.parentElement; parent && host.contains(parent); parent = parent.parentElement) {
                if (view.getComputedStyle(parent).overflowX !== 'visible') {
                  right = Math.min(right, parent.getBoundingClientRect().right);
                }
              }
              expect(right).withContext(context + '/' + element.tagName + '/right edge').toBeLessThanOrEqual(doc.documentElement.clientWidth);
            }
            for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.selection-panel, .selection-heading, .comparison-chips, .comparison-chip, .chart-card, .chart-container, .chart-values, .chart-values li'))) {
              expect(element.scrollWidth).withContext(context + '/' + element.className).toBeLessThanOrEqual(element.clientWidth);
            }
            expect(doc.querySelectorAll('.chart-card').length).toBe(1);
            expect(view.getComputedStyle(doc.querySelector('.comparison-chips')!).flexWrap).toBe('wrap');
            if (width < 640) {
              for (const button of Array.from(doc.querySelectorAll<HTMLButtonElement>('button'))) {
                expect(button.getBoundingClientRect().height).withContext(context + '/touch').toBeGreaterThanOrEqual(44);
                if (!button.disabled) {
                  button.focus();
                  expect(view.getComputedStyle(button).outlineStyle).withContext(context + '/focus').toBe('solid');
                }
              }
            }
            const article = doc.querySelector<HTMLElement>('.chart-card')!;
            const container = article.querySelector<HTMLElement>('.chart-container')!;
            const chart = article.querySelector<HTMLElement>('p-chart')!;
            expect(chart.getBoundingClientRect().height).withContext(context + '/fill').toBe(container.getBoundingClientRect().height);
            expect(container.getBoundingClientRect().height).withContext(context + '/height').toBe(width < 640 ? 320 : 420);
            expect(article.getBoundingClientRect().width).withContext(context + '/full-width').toBe(doc.querySelector<HTMLElement>('.selection-panel')!.getBoundingClientRect().width);
          } finally { frame.remove(); }
        }
      }
    }
  }, 30000);
});
