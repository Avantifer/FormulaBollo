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
  const card = (id: string): EvolutionChart => component['cards']().find(card => card.id === id)!;
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
    const datasets = card('points').data.datasets as ChartDataset<'line'>[];
    expect(datasets.map(dataset => dataset.label)).toEqual(['Piloto 02', 'Piloto 03', 'Piloto 04', 'Piloto 08', 'Piloto 05', 'Piloto 06']);
    expect(new Set(datasets.map(dataset => JSON.stringify(dataset.borderDash))).size).toBe(6);
    for (const chip of selected()) {
      const index = datasets.findIndex(dataset => dataset.label === chip.textContent!.trim());
      expect(chip.querySelector('line')!.getAttribute('stroke')).toBe(String(datasets[index].borderColor));
      const dash = datasets[index].borderDash as number[];
      expect(chip.querySelector('line')!.getAttribute('stroke-dasharray')).toBe(dash.join(' ') || null);
      expect(card('points').values[index].dash).toEqual(dash);
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

  it('passes actual cumulative data to three accessible p-charts and visible associated value lists', async () => {
    load();
    await fixture.whenStable();
    expect(component['cards']().map(card => card.id)).toEqual(['points', 'gap', 'position']);
    expect(card('points').data.datasets.map(dataset => dataset.data)).toEqual([[25, 50], [24, 49], [23, 49], [22, 47]]);
    expect(card('points').values[0].value).toBe('50 pts');
    for (const element of fixture.debugElement.queryAll(element => element.name === 'p-chart')) {
      const chart = element.componentInstance as { data: ChartData; options: ChartOptions };
      expect(component['cards']().some(card => card.data === chart.data && card.options === chart.options)).toBeTrue();
    }
    expect(root().querySelectorAll('canvas').length).toBe(3);
    for (const article of Array.from(root().querySelectorAll('article'))) {
      const image = article.querySelector('[role="img"]')!;
      expect(image.getAttribute('aria-label')).toContain(article.querySelector('h3')!.textContent!);
      expect(image.getAttribute('aria-describedby')).toBe(article.querySelector('ul')!.id);
      expect(article.querySelectorAll('.chart-values li').length).toBe(4);
      expect(article.querySelectorAll('.chart-values .swatch').length).toBe(4);
    }
    expect(root().textContent).not.toContain('Media de puntos por carrera');
  });

  it('calculates gaps and shared ranks against every driver, including an unselected driver beyond eight', () => {
    const data = statisticsFixture(3);
    data.driverEvolution.series[9].cumulative = [40, 45];
    load(data);
    expect(component['selectedIds']()).not.toContain(10);
    expect(card('gap').data.datasets.map(dataset => dataset.data)).toEqual([[-15, 0], [-16, -1], [-17, -1], [-18, -3]]);
    expect(card('position').data.datasets.map(dataset => dataset.data)).toEqual([[2, 1], [3, 2], [4, 2], [5, 4]]);
    expect(card('gap').options.scales!['y']!.max).toBe(0);
    expect(card('gap').note).toBe('Cero significa liderar la clasificación tras esa carrera.');
    click(0);
    expect(card('gap').data.datasets[0].data).toEqual([-16, -1]);
    expect(card('position').data.datasets[0].data).toEqual([3, 2]);
    expect(card('position').values[0].value).toBe('2º');
    const scale = card('position').options.scales!['y']!;
    expect(scale.reverse).toBeTrue();
    expect(scale.min).toBe(1);
    expect(scale.max).toBe(6);
    expect(scale.ticks).toEqual(jasmine.objectContaining({ precision: 0, stepSize: 1 }));
    expect(card('position').note).toBe('Un empate comparte posición.');
    expect((card('position').data.datasets as ChartDataset<'line'>[]).every(dataset => dataset.stepped === true)).toBeTrue();
  });

  it('uses every team for gaps and ranks, keeps ties and excludes vacant team chips', () => {
    const data = statisticsFixture(3);
    data.teamEvolution.series[9].cumulative = [80, 96];
    data.teamEvolution.series[2].cumulative = [48, 99];
    data.teamEvolution.series.push({ team: { ...data.teams[0].team, id: 99, name: 'vAcAnTe2' }, cumulative: [0, 0] });
    load(data);
    teams();
    expect(chips().length).toBe(10);
    expect(card('points').data.datasets[0].data).toEqual([50, 100]);
    expect(card('gap').data.datasets.map(dataset => dataset.data)).toEqual([[-30, 0], [-32, -1], [-31, -1], [-33, -3]]);
    expect(card('position').data.datasets.map(dataset => dataset.data)).toEqual([[2, 1], [4, 2], [3, 2], [5, 4]]);
    expect(card('position').options.scales!['y']!.max).toBe(6);
    expect(root().querySelector('[aria-live="polite"]')!.textContent).toBe('Mostrando 4 escuderías');
  });

  it('labels only final points with names and values, separates tied labels and uses race titles in tooltips', () => {
    load();
    for (const item of component['cards']()) {
      const labels = item.options.plugins!.datalabels!;
      const display = labels.display as (context: unknown) => boolean;
      expect(display({ dataIndex: 0, dataset: { data: [25, 50] } })).toBeFalse();
      expect(display({ dataIndex: 1, dataset: { data: [25, 50] } })).toBeTrue();
      const formatter = labels.formatter as (value: number, context: unknown) => string;
      expect(formatter(item.id === 'gap' ? -69 : 2, { dataset: { label: 'Bubapu' } })).toBe(item.id === 'gap' ? 'Bubapu -69' : 'Bubapu 2');
      const datasets = item.data.datasets as ChartDataset<'line'>[];
      expect(datasets[1].datalabels).not.toEqual(datasets[2].datalabels);
      const radius = datasets[0].pointRadius as (context: unknown) => number;
      expect(radius({ dataIndex: 0 })).toBe(item.id === 'position' ? 4 : 0);
      expect(radius({ dataIndex: 1 })).toBe(4);
      const title = item.options.plugins!.tooltip!.callbacks!.title as (items: unknown[]) => string;
      expect(title([{ dataIndex: 1 }])).toBe('Carrera B');
      expect(item.data.labels).toEqual(['1', '2']);
      expect(item.options.scales!['x']!.ticks!.maxTicksLimit).toBe(3);
      expect(item.options.scales!['x']!.title!.text).toBe('Carrera disputada');
      expect(item.options.animation).toBeFalse();
    }
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
    expect(root().querySelectorAll('p-skeleton').length).toBe(4);
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
    expect(card('gap').data.datasets[0].data).toEqual([0]);
    expect(card('position').data.datasets[0].data).toEqual([1]);
    expect(card('position').options.scales!['y']!.max).toBe(1);
  });

  it('rebuilds options from theme tokens without resetting selection or requesting data, and adapts mobile heights', () => {
    load();
    click(0);
    click(6);
    const ids = [...component['selectedIds']()];
    const light = component['palette']().ink;
    const previous = card('points').options;
    TestBed.inject(ThemeService).setDarkTheme(true);
    render();
    expect(card('points').options).not.toBe(previous);
    expect(component['palette']().ink).not.toBe(light);
    expect(component['selectedIds']()).toEqual(ids);
    for (const item of component['cards']()) {
      expect(item.options.color).toBe(component['palette']().ink);
      expect(item.options.scales!['x']!.grid!.color).toBe(component['palette']().rule);
    }
    component['mobile'].set(true);
    render();
    expect(card('points').height).toBeLessThan(350);
    expect(card('points').options.layout!.padding).toEqual(jasmine.objectContaining({ right: 138 }));
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
            for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.selection-panel, .selection-heading, .comparison-chips, .comparison-chip, .dashboard-grid, .chart-card, .chart-container, .chart-values, .chart-values li'))) {
              expect(element.scrollWidth).withContext(context + '/' + element.className).toBeLessThanOrEqual(element.clientWidth);
            }
            const grid = doc.querySelector<HTMLElement>('.dashboard-grid')!;
            expect(view.getComputedStyle(grid).gridTemplateColumns.split(' ').length).toBe(width >= 1024 ? 12 : 1);
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
            if (width >= 1024) {
              const cards = Array.from(doc.querySelectorAll<HTMLElement>('.chart-card'));
              expect(cards[1].getBoundingClientRect().top).toBe(cards[2].getBoundingClientRect().top);
              expect(cards[1].getBoundingClientRect().height).toBe(cards[2].getBoundingClientRect().height);
              for (const article of cards) {
                const container = article.querySelector<HTMLElement>('.chart-container')!;
                const chart = article.querySelector<HTMLElement>('p-chart')!;
                expect(chart.getBoundingClientRect().height).toBe(container.getBoundingClientRect().height);
              }
            }
          } finally { frame.remove(); }
        }
      }
    }
  }, 30000);
});
