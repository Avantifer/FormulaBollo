import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { Season } from '../../../shared/models/season';
import { SeasonApiService } from '../../../shared/services/api/season-api.service';
import { StatisticsApiService } from '../../../shared/services/api/statistics-api.service';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { StatisticsComponent } from './statistics.component';
import { GeneralStatsComponent } from './general-stats/general-stats.component';
import { EvolutionStatsComponent } from './evolution-stats/evolution-stats.component';
import { ComparativeStatsComponent } from './comparative-stats/comparative-stats.component';
import { recordsFixture, statisticsFixture } from './statistics.fixture';

describe('StatisticsComponent', () => {
  const seasons = [1, 2, 3].map(number => new Season(number, 'Temporada ' + number, number));
  let fixture: ComponentFixture<StatisticsComponent>;
  let component: StatisticsComponent;
  let api: jasmine.SpyObj<StatisticsApiService>;
  const root = (): HTMLElement => fixture.nativeElement;
  const render = (): void => { fixture.detectChanges(); fixture.detectChanges(); };
  const tab = (value: string): HTMLButtonElement => root().querySelector<HTMLButtonElement>('#statistics-tab-' + value)!;
  const select = (value: string): void => { tab(value).click(); render(); };
  const type = (teams: boolean): void => { root().querySelectorAll<HTMLButtonElement>('.entity-switch button')[teams ? 1 : 0].click(); render(); };

  beforeEach(() => {
    api = jasmine.createSpyObj('StatisticsApiService', ['getOverview', 'getHeadToHead', 'getRecords']);
    api.getRecords.and.callFake(() => of(recordsFixture()));
    api.getOverview.and.callFake(season => of(statisticsFixture(season)));
    api.getHeadToHead.and.callFake((season, a, b) => of({ season, a, b, aheadA: 0, aheadB: 0, comparable: 0, bothDnf: 0, pointsA: 0, pointsB: 0, races: [] }));
    TestBed.configureTestingModule({
      imports: [StatisticsComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: SeasonApiService, useValue: { getSeasons: () => of(seasons) } },
        { provide: StatisticsApiService, useValue: api }
      ]
    });
    fixture = TestBed.createComponent(StatisticsComponent);
    component = fixture.componentInstance;
    render();
  });

  afterEach(() => fixture.destroy());

  it('shows a single visible h1 and links every tab to its panel with roving tabindex', () => {
    const tabs = root().querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(root().querySelector('[role="tablist"]')).not.toBeNull();
    expect(tabs.length).toBe(4);
    expect(Array.from(tabs, tab => tab.textContent!.trim())).toEqual(['General', 'Evolución', 'Comparativa', 'Récords']);
    for (const button of Array.from(tabs)) {
      button.click();
      render();
      const headings = root().querySelectorAll('h1');
      expect(headings.length).toBe(1);
      expect(headings[0].textContent).toBe('Estadísticas');
      expect(headings[0].classList.contains('sr-only')).toBeFalse();
      expect(headings[0].classList.contains('text-display-md')).toBeTrue();
      expect(root().querySelectorAll('[role="tab"][tabindex="0"]').length).toBe(1);
      expect(button.getAttribute('aria-selected')).toBe('true');
      const panel = root().querySelector<HTMLElement>('#' + button.getAttribute('aria-controls'))!;
      expect(panel.hidden).toBeFalse();
      expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
    }
  });

  it('handles both arrows with wrapping and Home/End, focuses the activated tab and ignores other keys', () => {
    for (const [from, key, to] of [
      ['general', 'ArrowRight', 'evolucion'], ['evolucion', 'ArrowLeft', 'general'],
      ['general', 'ArrowLeft', 'records'], ['records', 'ArrowRight', 'general'],
      ['general', 'End', 'records'], ['records', 'Home', 'general']
    ]) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      tab(from).dispatchEvent(event);
      render();
      expect(event.defaultPrevented).toBeTrue();
      expect(tab(to).getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(tab(to));
    }
    tab('general').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    render();
    expect(tab('general').getAttribute('aria-selected')).toBe('true');
  });

  it('mounts only the selected child and preserves season/type state across tabs', () => {
    expect(root().querySelector('app-general-stats')).not.toBeNull();
    const selector = fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
    expect(selector.variant()).toBe('tabs');
    expect(selector.seasons().map(season => season.number)).toEqual([0, 1, 2, 3]);
    selector.seasonForm.get('season')!.setValue(seasons[1]);
    type(true);
    const general = fixture.debugElement.query(By.directive(GeneralStatsComponent)).componentInstance as GeneralStatsComponent;
    expect(general.seasonSelected().number).toBe(2);
    expect(general.typeSelected()).toBe('Equipos');
    expect(api.getOverview.calls.allArgs()).toEqual([[0], [2]]);
    select('evolucion');
    expect(root().querySelector('app-general-stats')).toBeNull();
    const evolution = fixture.debugElement.query(By.directive(EvolutionStatsComponent)).componentInstance as EvolutionStatsComponent;
    expect(evolution.seasonSelected().number).toBe(2);
    expect(evolution.typeSelected()).toBe('Equipos');
    const evolutionSelector = fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
    expect(evolutionSelector.seasons().some(season => season.number === 0)).toBeFalse();
    component.onSeasonChange(seasons[2]);
    render();
    select('comparative');
    const comparative = fixture.debugElement.query(By.directive(ComparativeStatsComponent)).componentInstance as ComparativeStatsComponent;
    expect(comparative.seasonSelected().number).toBe(3);
    expect(comparative.typeSelected()).toBe('Equipos');
    select('records');
    expect(root().querySelector('app-records')).not.toBeNull();
    expect(root().querySelector('.statistics-controls')).toBeNull();
    select('general');
    expect(fixture.debugElement.query(By.directive(GeneralStatsComponent)).componentInstance.seasonSelected().number).toBe(2);
  });

  it('LAYOUT fits real dashboard styles at 320/390/768/1024/1296px in both themes, with 44px mobile targets and readable contrast', async () => {
    await fixture.whenStable();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');
    function contrast(foreground: string, background: string): number {
      const luminance = (color: string): number => {
        const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
          const channel = color.startsWith('color(srgb') ? value : value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    }
    for (const teams of [false, true]) {
      type(teams);
      await fixture.whenStable();
      for (const dark of [false, true]) {
        for (const width of [320, 358, 390, 768, 1024, 1296]) {
          const frame = document.createElement('iframe');
          Object.assign(frame.style, { width: width + 'px', height: '1200px', border: '0' });
          document.body.append(frame);
          try {
            const doc = frame.contentDocument!;
            doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + root().outerHTML + '</body>';
            doc.documentElement.classList.toggle('dark', dark);
            const fontOverride = doc.createElement('style');
            fontOverride.textContent = '* { font-family: Verdana, sans-serif !important; }';
            doc.head.append(fontOverride);
            await doc.fonts.ready;
            const view = frame.contentWindow!;
            const context = (teams ? 'teams' : 'drivers') + '/' + (dark ? 'dark' : 'light') + '/' + width;
            expect(doc.documentElement.scrollWidth).withContext(context + '/document overflow').toBeLessThanOrEqual(doc.documentElement.clientWidth);
            for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.statistics-header, .content-tabs, .content-tab, .statistics-controls, .key-figures, .key-figure, .key-detail, .dashboard-grid, .chart-card, .chart-container, .chart-values, .chart-values li'))) {
              expect(element.scrollWidth).withContext(context + '/' + element.className).toBeLessThanOrEqual(element.clientWidth);
            }
            for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.key-figure, .card-heading h3, .card-heading p, .chart-note, .chart-values'))) {
              const css = view.getComputedStyle(element);
              const panel = element.closest<HTMLElement>('.chart-card, .key-figures')!;
              expect(contrast(css.color, view.getComputedStyle(panel).backgroundColor)).withContext(context + '/contrast').toBeGreaterThanOrEqual(4.5);
            }
            if (width < 768) {
              for (const button of Array.from(doc.querySelectorAll<HTMLButtonElement>('button'))) {
                expect(button.getBoundingClientRect().height).withContext(context + '/touch height').toBeGreaterThanOrEqual(44);
                button.focus();
                expect(view.getComputedStyle(button).outlineStyle).withContext(context + '/focus').toBe('solid');
              }
            }
            const grid = doc.querySelector<HTMLElement>('.dashboard-grid')!;
            expect(view.getComputedStyle(grid).gridTemplateColumns.split(' ').length).toBe(width >= 1024 ? 12 : 1);
          } finally { frame.remove(); }
        }
      }
    }
  }, 30000);
});
