import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { UIChart } from 'primeng/chart';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { CacheService } from '../../../../shared/services/cache.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { ImageService } from '../../../../shared/services/image.service';
import { StatisticsRecords } from '../../../../shared/models/statistics';
import { recordsFixture } from '../statistics.fixture';
import { RecordsComponent } from './records.component';

describe('RecordsComponent', () => {
  let fixture: ComponentFixture<RecordsComponent>;
  let component: RecordsComponent;
  let http: HttpTestingController;
  const root = (): HTMLElement => fixture.nativeElement;
  const render = () => fixture.detectChanges();
  const request = () => http.expectOne(req => req.url.endsWith('/statistics/records'));
  const load = (data = recordsFixture()) => { request().flush(data); render(); };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RecordsComponent], providers: provideComponentTesting() }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RecordsComponent);
    component = fixture.componentInstance;
    render();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
    TestBed.inject(CacheService).clearCache();
    TestBed.inject(ThemeService).setDarkTheme(false);
  });

  it('renders the year range, one tab h2, season totals and category count', () => {
    load();
    expect(root().querySelectorAll('h2').length).toBe(1);
    expect(root().querySelector('h2')!.textContent).toBe('3 temporadas. 8 hitos.');
    expect(root().querySelector('.eyebrow')!.textContent).toBe('Récords históricos · 2023—2025');
    expect(Array.from(root().querySelectorAll('.totals dd'), el => el.textContent)).toEqual(['3', '68 / 74', '8']);
  });

  it('renders champions, provisional leader, closed and open season states and margins', () => {
    load();
    const seasons = root().querySelectorAll('.season');
    expect(seasons.length).toBe(3);
    expect(seasons[0].textContent).toContain('24 GP · Cerrada');
    expect(seasons[0].querySelector('.champion')!.textContent).toContain('Campeón de la temporada');
    expect(seasons[0].querySelector('.champion')!.textContent).toContain('+76 pt');
    expect(seasons[0].querySelector('.champion')!.textContent).toContain('430 puntos · margen sobre el segundo');
    expect(seasons[2].textContent).toContain('18 / 24 GP · En curso');
    expect(seasons[2].querySelector('.champion')!.textContent).toContain('Líder provisional · título abierto');
    expect(seasons[2].textContent).toContain('Quedan 6 carreras. La historia de esta temporada todavía está abierta.');
  });

  it('places only season holders on the timeline, includes coholders and historical team identities', () => {
    const data = recordsFixture();
    load(data);
    const seasons = root().querySelectorAll('.season');
    for (let i = 0; i < seasons.length; i++) {
      expect(seasons[i].querySelectorAll('.pin').length).toBe(data.driverRecords.filter(board => board.holders.some(entry => entry.season === i + 1)).length);
    }
    const podiums = seasons[2].querySelector('[data-record="podiums"]')!;
    expect(podiums.querySelectorAll('.person').length).toBe(2);
    expect(podiums.textContent).toContain('Cotitulares');
    expect(seasons[0].querySelector('[data-record="poles"]')!.textContent).toContain('AlphaTauri');
    expect(seasons[2].querySelector('[data-record="poles"]')!.textContent).toContain('McLaren');
    expect(seasons[0].textContent).toContain('Un récord que sigue en pie: SmokingWeed lo iguala en T3.');
  });

  it('formats percent with one es-ES decimal and styles negative records without a trophy', () => {
    load();
    const dubious = root().querySelector('.pin[data-record="penalties"]')!;
    expect(dubious.classList.contains('dubious')).toBeTrue();
    expect(dubious.querySelector('.pin-value')!.textContent).toBe('5');
    expect(root().textContent).not.toMatch(/dudoso/i);
    expect(dubious.querySelector('.pi-trophy')).toBeNull();
    expect(root().querySelector('.pin[data-record="winRate"] .pin-value')!.textContent).toBe('37,5 %');
    expect(root().querySelector('.pin[data-record="points"] .pin-value')!.textContent).toBe('430');
    expect(root().querySelector('.pin[data-record="points"] .pi-trophy')).not.toBeNull();
  });

  it('renders the leading holder, every holder chip and category help', () => {
    load();
    expect(root().querySelector('.owner-lead > strong')!.textContent).toBe('3');
    expect(root().querySelector('.owner-lead')!.textContent).toContain('SmokingWeed');
    expect(root().querySelectorAll('.owner-list li').length).toBe(5);
    expect(root().querySelector('.owners > .help')!.textContent).toContain('8 categorías');
  });

  it('provides the chart, five continuous series, distinct teammate markers, accessible values and pending rows', () => {
    load();
    const chart = fixture.debugElement.query(By.directive(UIChart)).componentInstance as UIChart;
    expect(chart.type).toBe('line');
    expect(chart.data.datasets.length).toBe(5);
    expect(chart.data.datasets.every((dataset: { borderDash: number[] }) => dataset.borderDash.length === 0)).toBeTrue();
    expect(chart.data.datasets[2].borderColor).toBe(chart.data.datasets[3].borderColor);
    expect(chart.data.datasets[2].pointStyle).not.toBe(chart.data.datasets[3].pointStyle);
    expect(chart.data.datasets[0].data.slice(-6)).toEqual(Array(6).fill(null));
    expect(root().querySelector('[role="img"]')!.getAttribute('aria-label')).toContain('Victorias acumuladas');
    expect(root().querySelectorAll('.chart-values li').length).toBe(5);
    const table = root().querySelector('div.sr-only > table')!;
    expect(table.querySelectorAll('tbody tr').length).toBe(74);
    expect(table.querySelector('tbody tr:last-child')!.textContent).toContain('Pendiente');
    expect(root().querySelector('table.sr-only')).toBeNull();
    expect(root().querySelector('.chart-note')!.textContent).toContain('Récord de trayectoria');
  });

  it('renders tied current holders, both chasers in competition order and expandable full rankings', () => {
    load();
    const row = root().querySelector('.record-table[data-kind="driver"] [data-record="poles"]')!;
    expect(row.querySelectorAll('.holder').length).toBe(2);
    expect(row.textContent).toContain('AlphaTauri');
    expect(row.textContent).toContain('McLaren');
    expect(row.querySelectorAll('.chaser').length).toBe(2);
    expect(row.querySelector('.chaser')!.textContent).toContain('3.º');
    const details = row.querySelector('details')!;
    expect(details.querySelector('summary')!.textContent).toBe('Ver top 5 por temporada');
    expect(details.querySelectorAll('li').length).toBe(5);
    details.querySelector('summary')!.click();
    expect(details.open).toBeTrue();
    for (const table of Array.from(root().querySelectorAll('table'))) {
      expect(table.querySelector('caption')).not.toBeNull();
      expect(Array.from(table.querySelectorAll('th')).every(th => th.hasAttribute('scope'))).toBeTrue();
    }
  });

  it('keeps tied team records and removes the unusual races section', () => {
    load();
    const teams = root().querySelector('.record-table[data-kind="team"]')!;
    expect(teams.querySelector('[data-record="teamDoublePodiums"]')!.querySelectorAll('.holder').length).toBe(2);
    expect(root().querySelector('#teams-heading')).not.toBeNull();
    expect(root().querySelector('.record-table[data-kind="race"]')).toBeNull();
    expect(root().textContent).not.toContain('Carreras fuera de lo común');
  });

  it('omits records at risk and keeps consecutive panel ordinals', () => {
    load();
    expect(root().querySelector('.risk')).toBeNull();
    expect(root().textContent).not.toContain('Récords en peligro');
    expect(Array.from(root().querySelectorAll('.ordinal'), el => el.textContent)).toEqual(['01', '02', '03']);
    expect(root().querySelector('[aria-labelledby="teams-heading"]')!.nextElementSibling).toBeNull();
  });

  it('uses router links, two letter fallback avatars and ImageService with failure fallback', () => {
    const data = recordsFixture();
    data.seasons[0].leader!.driver.driverImage = 'bubapu.webp';
    const images = spyOn(TestBed.inject(ImageService), 'getImageUrl').and.returnValue('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    load(data);
    expect(images).toHaveBeenCalledWith('bubapu.webp');
    expect(root().querySelector('a[href="/drivers/Dani_Calde"]')).not.toBeNull();
    expect(root().querySelector('a[href="/teams/Red_Bull"]')).not.toBeNull();
    expect(root().querySelector('[aria-label="Dani Calde: sin foto"]')!.textContent).toBe('DC');
    root().querySelector('img.avatar')!.dispatchEvent(new Event('error'));
    render();
    expect(root().querySelector('img.avatar')).toBeNull();
    expect(root().querySelector('[aria-label="Bubapu: sin foto"]')!.textContent).toBe('BU');
    for (const link of Array.from(root().querySelectorAll('a'))) expect(link.tabIndex).toBe(0);
  });

  it('updates chart palette for light and dark themes and mobile ticks without HTTP reload', () => {
    TestBed.inject(ThemeService).setDarkTheme(false);
    load();
    const initial = component['chart']();
    TestBed.inject(ThemeService).setDarkTheme(true);
    render();
    expect(component['chart']()).not.toBe(initial);
    expect(component['chart']().options.color).toBe(component['palette']().ink);
    expect(component['chart']().options.plugins!.tooltip).toEqual(jasmine.objectContaining({ backgroundColor: component['palette']().panel, bodyColor: component['palette']().ink }));
    component['mobile'].set(true);
    expect(component['chart']().options.scales!['x']!.ticks!.maxTicksLimit).toBe(6);
    http.expectNone(() => true);
  });

  it('shows skeletons, a working error retry, and the empty state', () => {
    expect(root().querySelectorAll('p-skeleton').length).toBe(6);
    expect(root().querySelector('[aria-busy="true"]')).not.toBeNull();
    request().flush({}, { status: 500, statusText: 'Error' });
    render();
    expect(root().querySelector('[role="alert"]')!.textContent).toContain('No se pudieron cargar los récords.');
    root().querySelector<HTMLButtonElement>('.retry-button')!.click();
    render();
    expect(root().querySelector('p-skeleton')).not.toBeNull();
    const data = recordsFixture();
    data.seasons = []; data.driverRecords = [];
    load(data);
    expect(root().querySelector('[role="status"]')!.textContent).toBe('Todavía no hay récords.');
  });

  it('cancels the pending HTTP request on destruction', () => {
    const pending = request();
    fixture.destroy();
    expect(pending.cancelled).toBeTrue();
  });

  it('shows the team section only when there are team records', () => {
    const data = recordsFixture();
    data.teamRecords = [];
    load(data);
    expect(root().querySelector('.record-table[data-kind="team"]')).toBeNull();
    expect(root().querySelector('#teams-heading')).toBeNull();
    expect(Array.from(root().querySelectorAll('.ordinal'), el => el.textContent)).toEqual(['01', '02']);
    component['data'].set({ ...data, teamRecords: recordsFixture().teamRecords });
    render();
    expect(root().querySelector('.record-table[data-kind="team"]')).not.toBeNull();
    expect(Array.from(root().querySelectorAll('.ordinal'), el => el.textContent)).toEqual(['01', '02', '03']);
    expect(root().querySelector('.record-table[data-kind="race"]')).toBeNull();
    expect(root().querySelector('.races')).toBeNull();
  });

  it('handles all optional lists, null leaders, empty holders and rankings without errors or excluded content', () => {
    const data = recordsFixture();
    data.seasons.forEach(season => season.leader = null);
    data.holderCounts = []; data.teamRecords = [];
    data.victoryProgress = { races: [], series: [] };
    data.driverRecords.forEach(board => { board.holders = []; board.ranking = []; });
    load(data);
    expect(root().querySelector('.owners')).toBeNull();
    expect(root().querySelector('.champion')).toBeNull();
    expect(root().querySelector('.record-table[data-kind="team"]')).toBeNull();
    expect(root().querySelector('.races')).toBeNull();
    expect(root().querySelector('p-chart')).toBeNull();
    expect(root().textContent).not.toMatch(/Nuevo|Vista estática|Rachas|Archivo histórico|Situación de todos/);
    component['data'].set({ ...data, driverRecords: [], teamRecords: recordsFixture().teamRecords });
    render();
    expect(root().textContent).toContain('Todavía no hay récords de piloto.');
    expect(root().querySelector('#teams-heading')).not.toBeNull();
    component['data'].set({ ...data, seasons: [] }); render();
    expect(component['years']()).toBe('—');
  });

  it('LAYOUT fits every descendant at 320/390/768/1024/1296px in both themes with real CSS, Verdana and 44px mobile targets', async () => {
    const data: StatisticsRecords = recordsFixture();
    data.seasons[0].leader!.driver.name = 'Piloto con un nombre muy largo para comprobar';
    const board = data.driverRecords[0];
    board.holders = [1, 2, 3, 4, 5].map(season => ({
      ...board.holders[0], season,
      driver: { ...board.holders[0].driver!, name: 'PilotoConUnNombreMuyLargoSinEspaciosParaComprobar' }
    }));
    load(data);
    await fixture.whenStable();
    root().querySelectorAll('details').forEach(details => details.open = true);
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');
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
          const context = (dark ? 'dark' : 'light') + '/' + width;
          expect(doc.documentElement.scrollWidth).withContext(context + '/document').toBeLessThanOrEqual(doc.documentElement.clientWidth);
          const host = doc.querySelector('.my-container')!.firstElementChild!;
          for (const element of Array.from(host.querySelectorAll<HTMLElement>('*'))) {
            if (element.closest('.sr-only') || element.tagName === 'COL') continue;
            const rect = element.getBoundingClientRect();
            if (!rect.width) continue;
            expect(rect.right).withContext(context + '/' + element.tagName + '.' + element.className + '/right').toBeLessThanOrEqual(doc.documentElement.clientWidth + .5);
            expect(rect.left).withContext(context + '/' + element.tagName + '/left').toBeGreaterThanOrEqual(-.5);
            expect(element.scrollWidth).withContext(context + '/' + element.tagName + '.' + element.className + '/scroll').toBeLessThanOrEqual(element.clientWidth + 1);
          }
          expect(doc.querySelectorAll('.season').length).toBe(3);
          expect(doc.querySelector('div.sr-only > table')).not.toBeNull();
          expect(view.getComputedStyle(doc.querySelector('.panel')!).boxShadow).toBe('none');
          if (width < 640) {
            for (const target of Array.from(host.querySelectorAll<HTMLElement>('a, button, summary'))) {
              const rect = target.getBoundingClientRect();
              expect(rect.height).withContext(context + '/' + target.textContent + '/touch-height').toBeGreaterThanOrEqual(44);
              expect(rect.width).withContext(context + '/' + target.textContent + '/touch-width').toBeGreaterThanOrEqual(44);
            }
            expect(view.getComputedStyle(doc.querySelector('.record-table thead')!).display).toBe('none');
          }
        } finally { frame.remove(); }
      }
    }
  }, 30000);
});
