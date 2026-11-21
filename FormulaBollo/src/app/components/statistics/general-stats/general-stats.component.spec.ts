import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ChartData, ChartDataset, ChartOptions } from 'chart.js';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { CacheService } from '../../../../shared/services/cache.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { Season } from '../../../../shared/models/season';
import { StatisticsOverview } from '../../../../shared/models/statistics';
import { statisticsFixture } from '../statistics.fixture';
import { buildStatisticsCharts, StatisticsChart } from './general-stats.charts';
import { GeneralStatsComponent } from './general-stats.component';

describe('GeneralStatsComponent', () => {
  let fixture: ComponentFixture<GeneralStatsComponent>;
  let component: GeneralStatsComponent;
  let http: HttpTestingController;
  let originalDark: boolean;
  const root = (): HTMLElement => fixture.nativeElement;
  const render = (): void => { fixture.detectChanges(); fixture.detectChanges(); };
  const card = (id: string): StatisticsChart => component['cards']().find(card => card.id === id)!;
  const load = (data = statisticsFixture()): StatisticsOverview => {
    render();
    http.expectOne(request => request.url.endsWith('/statistics/overview')).flush(data);
    render();
    return data;
  };
  const selectTeams = (): void => { fixture.componentRef.setInput('typeSelected', 'Equipos'); render(); };

  beforeEach(() => {
    originalDark = document.documentElement.classList.contains('dark');
    TestBed.configureTestingModule({
      imports: [GeneralStatsComponent],
      providers: provideComponentTesting()
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(ThemeService).setDarkTheme(false);
    fixture = TestBed.createComponent(GeneralStatsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('seasonSelected', new Season(0, 'Total', 0));
    fixture.componentRef.setInput('typeSelected', 'Pilotos');
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    TestBed.inject(CacheService).clearCache();
    document.documentElement.classList.toggle('dark', originalDark);
  });

  it('requests once per season, shares drivers/teams and does not reload an equivalent season', () => {
    load();
    selectTeams();
    fixture.componentRef.setInput('typeSelected', 'Pilotos');
    fixture.componentRef.setInput('seasonSelected', new Season(0, 'Total', 0));
    render();
    http.expectNone(request => request.url.endsWith('/statistics/overview'));
    fixture.componentRef.setInput('seasonSelected', new Season(2, 'Temporada 2', 2));
    render();
    const request = http.expectOne(request => request.params.get('season') === '2');
    request.flush(statisticsFixture(2));
    render();
    expect(component['overview']()!.season).toBe(2);
  });

  it('renders the four summary figures from the contract and seasonal sparklines in numeric season order', () => {
    load();
    const figures = Array.from(root().querySelectorAll('.key-figure'));
    expect(figures.length).toBe(4);
    expect(figures[0].textContent).toContain('1000');
    expect(figures[0].textContent).toContain('Ventaja 30 pts');
    expect(figures[1].textContent).toContain('8 ganadores distintos');
    expect(figures[2].textContent).toContain('42,5 %');
    expect(figures[3].textContent).toContain('12,5 %');
    expect(root().querySelectorAll('.key-main svg').length).toBe(4);
    expect(root().querySelector('polyline')!.getAttribute('points')).toBe('2,30 44,15.142857142857142 86,4');
    selectTeams();
    expect(root().querySelector('.key-detail')!.textContent).toContain('McLaren');
  });

  it('omits sparklines with fewer than two seasons and handles an unavailable pole conversion', () => {
    const data = statisticsFixture();
    data.summary.poleWinRate = null;
    data.drivers.forEach(entry => entry.pointsBySeason = { '3': 100 });
    load(data);
    expect(root().querySelectorAll('.key-main svg').length).toBe(0);
    expect(root().querySelectorAll('.key-main')[2].textContent!.trim()).toBe('—');
  });

  it('renders exactly the 12 driver cards, their real chart types and accessible descriptions', async () => {
    load();
    await fixture.whenStable();
    expect(component['cards']().map(card => card.id)).toEqual([
      'evolution', 'winners', 'points', 'podiums', 'one-lap', 'poles-wins', 'average', 'reliability', 'penalties', 'conversion', 'hat-tricks', 'season-points'
    ]);
    expect(root().querySelectorAll('article.chart-card').length).toBe(12);
    expect(new Set(component['cards']().map(card => card.type))).toEqual(new Set(['line', 'doughnut', 'bar', 'bubble']));
    for (const article of Array.from(root().querySelectorAll('article'))) {
      expect(article.querySelector('h3')).not.toBeNull();
      const image = article.querySelector('[role="img"]')!;
      expect(image.getAttribute('aria-label')).toContain(article.querySelector('h3')!.textContent!);
      expect(article.querySelectorAll('li').length).toBeGreaterThanOrEqual(3);
    }
    expect(root().textContent).not.toMatch(/Variante 1|Nuevo|Vacante/i);
    expect(root().querySelectorAll('canvas').length).toBeGreaterThanOrEqual(12);
  });

  it('applies Top 10/8, alphabetical tie breaks, ordering, and excludes all vacant driver slots', () => {
    const data = statisticsFixture();
    data.drivers[12].totalPoints = 9999;
    data.drivers[13].victories = 100;
    data.drivers[2].totalPoints = data.drivers[1].totalPoints;
    data.driverEvolution.series.push({ driver: data.drivers[12].driver, cumulative: [9999, 99999] });
    load(data);
    expect(card('points').data.labels).toEqual(data.drivers.slice(0, 10).map(entry => entry.driver.name));
    expect(card('points').data.datasets[0].data).toEqual(data.drivers.slice(0, 10).map(entry => entry.totalPoints));
    expect(card('one-lap').data.labels!.length).toBe(8);
    expect(card('evolution').data.datasets.length).toBe(8);
    expect(JSON.stringify(component['cards']().map(card => card.data))).not.toMatch(/vacante/i);
    expect(component['remainingPoints']().count).toBe(2);
    expect(card('winners').data.labels!.at(-1)).toBe('Otros pilotos');
    expect(card('winners').data.datasets[0].data).toEqual([8, 7, 6, 5, 4, 6]);
  });

  it('enforces the inclusive eligibility thresholds and computes conversion from poleWins', () => {
    load();
    expect(card('conversion').data.labels![0]).toBe('Piloto 02');
    expect(card('conversion').data.datasets[0].data[0]).toBe(75);
    expect(card('conversion').data.labels).not.toContain('Piloto 01');
    expect(card('reliability').data.labels).toContain('Piloto 02');
    expect(card('reliability').data.labels).not.toContain('Piloto 01');
    const bubble = card('poles-wins').data.datasets.find(dataset => dataset.label === 'Piloto 02')!;
    expect(bubble.data[0]).toEqual(jasmine.objectContaining({ x: 4, y: 7 }));
    expect(card('average').data.datasets[0].data[0]).toBe(1000 / 7);
    expect(card('average').data.datasets[1].type).toBe('scatter');
    expect((card('average').data.datasets[0] as ChartDataset<'bar'>).barThickness).toBe(2);
  });

  it('builds podium, penalty, streak, hat-trick and per-season datasets from the contract', () => {
    load();
    expect(card('podiums').data.datasets.map(dataset => dataset.data[0])).toEqual([8, 3, 1]);
    expect(card('penalties').data.datasets.map(dataset => dataset.data[0])).toEqual([10, 5, 5]);
    expect(card('hat-tricks').data.datasets[0].data[0]).toBe(5);
    expect(card('season-points').data.datasets.map(dataset => dataset.label)).toEqual(['Temporada 1', 'Temporada 2', 'Temporada 3']);
    expect(card('season-points').data.datasets.map(dataset => dataset.data[0])).toEqual([150, 350, 500]);
    expect(card('evolution').data.datasets[0].data).toEqual([25, 50]);
  });

  it('reduces mobile rankings and line series to five without losing the remaining pilots', () => {
    load();
    component['mobile'].set(true);
    render();
    expect(card('points').data.labels!.length).toBe(5);
    expect(card('evolution').data.datasets.length).toBe(5);
    expect(card('one-lap').data.labels!.length).toBe(5);
    expect(component['remainingPoints']().count).toBe(7);
    selectTeams();
    expect(card('evolution').data.datasets.length).toBe(5);
    expect(card('points').data.labels!.length).toBe(9);
  });

  it('renders exactly the 13 team cards, drops zero-point teams from the bars, and uses calendar races for the average', () => {
    load();
    selectTeams();
    expect(component['cards']().map(card => card.id)).toEqual([
      'evolution', 'share', 'points', 'contributions', 'wins-podiums', 'winners', 'one-lap', 'duels', 'finished', 'double', 'reliability', 'penalties', 'average'
    ]);
    expect(root().querySelectorAll('article.chart-card').length).toBe(13);
    expect(card('points').data.labels).not.toContain('RB');
    expect(card('points').data.datasets[0].data.every(value => Number(value) > 0)).toBeTrue();
    expect(card('average').data.datasets[0].data[0]).toBe(1000 / 60);
    expect(card('finished').data.datasets[0].data[0]).toBe(40);
    expect(card('wins-podiums').data.datasets[0].data[0]).toEqual({ x: 6, y: 15 });
    expect(card('double').data.datasets.map(dataset => dataset.data[0])).toEqual([10, 4]);
    expect(card('share').data.datasets[0].data).toEqual([1000, 900, 800, 700, 600, 1400]);
  });

  it('excludes vacant duels and contributions, retains ties and makes the duel bars diverge around zero', () => {
    load();
    selectTeams();
    expect(card('duels').data.labels!.length).toBe(9);
    expect(card('duels').data.datasets.map(dataset => dataset.data[0])).toEqual([-6, 3]);
    expect(card('duels').values[0].value).toBe('Compañero A 0 6 / Compañero B 0 3 · Empates 1');
    expect(card('contributions').data.datasets.map(dataset => dataset.data[0])).toEqual([90, 50]);
    expect(card('contributions').data.datasets[1].data.at(-1)).toBe(0);
    expect(JSON.stringify(card('contributions').values)).not.toMatch(/vacante/i);
  });

  it('reconfigures CSS token colors on theme changes without making another HTTP request and disables motion', () => {
    load();
    const previous = card('points').options;
    const light = component['palette']().ink;
    TestBed.inject(ThemeService).setDarkTheme(true);
    render();
    expect(card('points').options).not.toBe(previous);
    expect(component['palette']().ink).not.toBe(light);
    for (const item of component['cards']()) expect(item.options.animation).toBeFalse();
    expect(card('points').options.scales!['y']!.ticks!.color).toBe(component['palette']().ink);
    http.expectNone(request => request.url.endsWith('/statistics/overview'));
  });

  it('shows skeletons, error and retry, then the empty state', () => {
    render();
    expect(root().querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(root().querySelectorAll('p-skeleton').length).toBe(10);
    http.expectOne(request => request.url.endsWith('/statistics/overview')).flush({}, { status: 500, statusText: 'Error' });
    render();
    expect(root().querySelector('[role="alert"]')!.textContent).toContain('No se pudieron cargar las estadísticas.');
    root().querySelector<HTMLButtonElement>('.retry-button')!.click();
    render();
    const empty = statisticsFixture();
    empty.summary.finishedRaces = 0;
    http.expectOne(request => request.url.endsWith('/statistics/overview')).flush(empty);
    render();
    expect(root().querySelector('[role="status"]')!.textContent).toContain('No hay estadísticas');
    expect(root().querySelector('article')).toBeNull();
  });

  it('hides the cards whose eligibility filter or values leave no data, instead of showing empty ones', () => {
    const data = statisticsFixture();
    data.drivers.forEach(entry => { entry.poles = 0; entry.races = 1; entry.racesFinished = 1; entry.victories = 0; entry.hatTricks = 0; });
    load(data);
    const ids = component['cards']().map(card => card.id);
    for (const hidden of ['poles-wins', 'conversion', 'reliability', 'hat-tricks', 'winners']) expect(ids).not.toContain(hidden);
    expect(root().querySelectorAll('article').length).toBe(ids.length);
    expect(root().querySelector('.insufficient-data')).toBeNull();
  });

  it('drops rows whose value is zero and keeps one stable colour per season in the season chart', () => {
    const data = statisticsFixture();
    data.drivers.forEach((entry, index) => entry.hatTricks = index < 2 ? 3 - index : 0);
    load(data);
    expect(card('hat-tricks').data.labels!.length).toBe(2);
    expect(card('hat-tricks').data.datasets[0].data).toEqual([3, 2]);
    expect(new Set(card('season-points').data.datasets.map(dataset => dataset.backgroundColor)).size).toBe(3);
  });

  it('paints a season with the same colour whether it is shown alone or with the others', () => {
    const colour = (labelled: string, chart: StatisticsChart) => chart.data.datasets.find(dataset => dataset.label === labelled)!.backgroundColor;
    const all = buildStatisticsCharts(statisticsFixture(), false, false, true, component['palette']()).find(chart => chart.id === 'season-points')!;
    const data = statisticsFixture();
    data.drivers.forEach(entry => entry.pointsBySeason = { '2': 10 });
    const alone = buildStatisticsCharts(data, false, false, true, component['palette']()).find(chart => chart.id === 'season-points')!;
    expect(alone.data.datasets.map(dataset => dataset.label)).toEqual(['Temporada 2']);
    expect(colour('Temporada 2', alone)).toBe(colour('Temporada 2', all));
  });

  it('identifies every series by name on the line chart and by a colour swatch in the value lists', () => {
    load();
    const evolution = card('evolution');
    const formatter = evolution.options.plugins!.datalabels!.formatter as (value: number, context: unknown) => string;
    expect(formatter(100, { dataset: { label: 'Piloto 01' } })).toBe('Piloto 01 100');
    expect(evolution.values.every(value => !!value.color && value.dash !== undefined)).toBeTrue();
    expect(evolution.values.map(value => value.dash!.length)).toContain(4);
    expect(card('winners').values.every(value => !!value.color)).toBeTrue();
    for (const id of ['evolution', 'winners', 'poles-wins']) {
      const article = root().querySelector('[data-chart="' + id + '"]')!;
      expect(article.querySelectorAll('.chart-values svg.swatch').length).withContext(id).toBe(card(id).values.length);
    }
  });

  it('calls the rows without a final position "sin terminar" instead of retirements', () => {
    load();
    expect(root().querySelector('.key-figures')!.textContent).toContain('Sin terminar');
    expect(root().textContent).not.toMatch(/Abandonos/);
    expect(card('reliability').data.datasets.map(dataset => dataset.label)).toEqual(['Terminadas (%)', 'Sin terminar (%)']);
    expect(card('reliability').note).toContain('no se distinguen');
  });

  it('shows readable tooltips for bubbles and scatter points', () => {
    load();
    const bubble = card('poles-wins');
    const label = bubble.options.plugins!.tooltip!.callbacks!.label! as (context: unknown) => string;
    expect(label({ dataset: { label: 'Piloto 02' }, raw: { x: 4, y: 7, r: 9.5 } })).toBe('Piloto 02: 4 poles · 7 victorias');
    expect(label({ dataset: { type: 'line', label: 'Igualdad' }, raw: { x: 4, y: 4 } })).toBe('Igualdad');
    selectTeams();
    const teamLabel = card('wins-podiums').options.plugins!.tooltip!.callbacks!.label! as (context: unknown) => string;
    expect(teamLabel({ dataset: { label: 'Equipo 01' }, raw: { x: 6, y: 15 } })).toBe('Equipo 01: 6 victorias · 15 podios');
  });

  it('cancels older responses before a new season loads and also cancels on destruction', () => {
    render();
    const old = http.expectOne(request => request.params.get('season') === '0');
    fixture.componentRef.setInput('seasonSelected', new Season(3, 'Temporada 3', 3));
    render();
    expect(old.cancelled).toBeTrue();
    const newer = statisticsFixture(3);
    newer.summary.margin = 987;
    http.expectOne(request => request.params.get('season') === '3').flush(newer);
    render();
    expect(root().textContent).toContain('Ventaja 987 pts');
    expect(() => old.flush(statisticsFixture())).toThrowError(/cancelled/i);
    expect(component['overview']()!.season).toBe(3);
    fixture.componentRef.setInput('seasonSelected', new Season(1, 'Temporada 1', 1));
    render();
    const pending = http.expectOne(request => request.params.get('season') === '1');
    fixture.destroy();
    expect(pending.cancelled).toBeTrue();
  });

  it('exposes valid real Chart.js data and options through p-chart', () => {
    load();
    const chart = fixture.debugElement.queryAll(element => element.name === 'p-chart')[0].componentInstance as { data: ChartData; options: ChartOptions };
    expect(chart.data).toBe(card('evolution').data);
    expect(chart.options).toBe(card('evolution').options);
  });
});
