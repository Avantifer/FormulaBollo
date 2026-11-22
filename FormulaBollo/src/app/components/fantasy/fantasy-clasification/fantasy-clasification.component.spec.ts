import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { CacheService } from '../../../../shared/services/cache.service';
import { ImageService } from '../../../../shared/services/image.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { SeasonApiService } from '../../../../shared/services/api/season-api.service';
import { SelectRacesComponent } from '../../../../shared/components/select-races/select-races.component';
import { Season } from '../../../../shared/models/season';
import { of } from 'rxjs';
import { ERROR_FANTASY_POINTS } from '../../../constants';
import { FantasyClasificationComponent } from './fantasy-clasification.component';
import { fantasyFixture, fantasySeason } from './fantasy-clasification.fixture';

describe('FantasyClasificationComponent', () => {
  let fixture: ComponentFixture<FantasyClasificationComponent>;
  let component: FantasyClasificationComponent;
  let http: HttpTestingController;
  const root = (): HTMLElement => fixture.nativeElement;
  const render = () => fixture.detectChanges();
  const request = () => http.expectOne(req => req.url.endsWith('/fantasy/clasification'));
  const load = (data = fantasyFixture()) => { request().flush(data); render(); };
  const selectRace = (id: number) => {
    const selector = fixture.debugElement.query(By.directive(SelectRacesComponent)).componentInstance as SelectRacesComponent;
    selector.racesForm.get('race')!.setValue(selector.races().find(race => race.id === id));
    render();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyClasificationComponent],
      providers: [...provideComponentTesting(), { provide: SeasonApiService, useValue: { getSeasonOfFantasy: () => of([fantasySeason]) } }]
    }).compileComponents();
    spyOn(TestBed.inject(ImageService), 'getImageUrl').and.returnValue('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    fixture = TestBed.createComponent(FantasyClasificationComponent);
    component = fixture.componentInstance;
    render();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify({ ignoreCancelled: true });
    TestBed.inject(CacheService).clearCache();
  });

  beforeEach(() => { http = TestBed.inject(HttpTestingController); });

  it('loads one season, renders the list and selects the leader by default', () => {
    expect(root().querySelector('[aria-busy="true"]')).not.toBeNull();
    const pending = request();
    expect(pending.request.params.get('numberSeason')).toBe('2');
    pending.flush(fantasyFixture()); render();
    expect(root().querySelectorAll('.ranking tbody tr').length).toBe(3);
    expect(component.selected()?.username).toBe('user3');
    expect(root().querySelector('.team-detail h2')!.textContent).toBe('Equipo de user3');
    expect(root().querySelector('.position')!.classList.contains('bg-fantasy')).toBeTrue();
    expect(root().querySelectorAll('.view-team')[0].getAttribute('aria-pressed')).toBe('true');
    expect(root().querySelector('.ranking caption')!.textContent).toContain('Temporada completa');
    http.expectNone(() => true);
  });

  it('changes the shared detail on Ver equipo and allows closing and reselecting it', () => {
    load();
    const button = root().querySelector<HTMLButtonElement>('[aria-label="Ver equipo de user1"]')!;
    expect(button.textContent!.trim()).toBe('Ver equipo');
    button.click(); render();
    expect(component.detail()?.standing.username).toBe('user1');
    expect(root().querySelector('.team-detail h2')!.textContent).toBe('Equipo de user1');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    root().querySelector<HTMLButtonElement>('.detail-close')!.click(); render();
    expect(root().querySelector('.team-detail')!.textContent).toContain('Elige un usuario para ver su equipo');
    button.click(); render();
    expect(component.detail()?.standing.username).toBe('user1');
    http.expectNone(() => true);
  });

  it('recalculates on circuit change, preserves selection when possible and falls back to the leader', () => {
    load();
    selectRace(25);
    expect(component.selected()?.username).toBe('user3');
    expect(component.rows().map(row => row.rank)).toEqual([1, 1, 3]);
    selectRace(26);
    expect(component.selected()?.username).toBe('user2');
    expect(component.detail()?.standing.points).toBe(60);
    expect(component.detail()?.scenario).toBe('Jeddah');
    selectRace(0);
    expect(component.detail()?.standing.points).toBe(111);
    http.expectNone(() => true);
  });

  it('uses ERROR_FANTASY_POINTS through the existing error handler and renders the error', () => {
    const handle = spyOn(TestBed.inject(UtilsService), 'handleError').and.callThrough();
    spyOn(console, 'error');
    request().flush({}, { status: 500, statusText: 'Offline' }); render();
    expect(handle).toHaveBeenCalledWith(ERROR_FANTASY_POINTS, jasmine.anything(), null);
    expect(root().querySelector('[role="alert"]')!.textContent).toBe(ERROR_FANTASY_POINTS);
    expect(root().querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('renders empty races and seasons', () => {
    load(); selectRace(28);
    expect(root().querySelector('[role="status"]')!.textContent).toContain('Sin elecciones en esta carrera.');
    expect(component.detail()).toBeNull();
    const empty = fantasyFixture(); empty.entries = [];
    component.data.set(empty); selectRace(0);
    expect(root().querySelector('[role="status"]')!.textContent).toContain('Sin elecciones en esta temporada.');
  });

  it('cancels obsolete season loads and ignores responses arriving before the cleanup effect', () => {
    const old = request();
    component.onSeasonChange(new Season(3, 'Temporada 3', 3));
    old.flush(fantasyFixture());
    expect(component.data()).toBeNull();
    render();
    const next = request();
    expect(next.request.params.get('numberSeason')).toBe('3');
    component.onSeasonChange(new Season(4, 'Temporada 4', 4)); render();
    expect(next.cancelled).toBeTrue();
    const latest = { ...fantasyFixture(), season: 4 };
    request().flush(latest); render();
    expect(component.data()?.season).toBe(4);
    fixture.destroy();
  });

  it('opens a modal bottom sheet, focuses its close button and returns focus after Escape', async () => {
    load(); component.mobile.set(true); render();
    const button = root().querySelector<HTMLButtonElement>('[aria-label="Ver equipo de user1"]')!;
    button.focus(); button.click(); render(); await fixture.whenStable();
    expect(component.sheetOpen()).toBeTrue();
    const dialog = root().querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Equipo de user1');
    component.focusSheet();
    expect(document.activeElement).toBe(dialog.querySelector('.detail-close'));
    const tab = new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true, cancelable: true });
    Object.defineProperty(tab, 'which', { value: 9 });
    dialog.querySelector<HTMLButtonElement>('.detail-close')!.dispatchEvent(tab);
    expect(document.activeElement).toBe(dialog.querySelector('.detail-close'));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    render(); await fixture.whenStable();
    expect(component.sheetOpen()).toBeFalse();
    expect(document.activeElement).toBe(button);
  });

  it('LAYOUT fits 320–1296px in light and dark with long usernames and 44px mobile buttons', async () => {
    const data = fantasyFixture();
    data.entries.filter(entry => entry.account.id === 1).forEach(entry => entry.account.username = 'UsuarioConUnNombreMuyLargoSinEspacios');
    load(data); await fixture.whenStable();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); } catch { return []; }
    }).join('\n');
    for (const dark of [false, true]) {
      for (const width of [320, 390, 768, 1024, 1296]) {
        const frame = document.createElement('iframe');
        Object.assign(frame.style, { width: width + 'px', height: '1200px', border: '0' }); document.body.append(frame);
        try {
          const doc = frame.contentDocument!;
          doc.documentElement.innerHTML = '<head><style>' + styles + '</style><style>* { font-family: Verdana, sans-serif !important; }</style></head><body>' + root().outerHTML + '</body>';
          doc.documentElement.classList.toggle('dark', dark); await doc.fonts.ready;
          const context = width + '/' + (dark ? 'dark' : 'light');
          expect(doc.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(doc.documentElement.clientWidth);
          for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.ranking, .filters, .team-detail, .pick, .username, .view-team'))) {
            if (!element.getBoundingClientRect().width) continue;
            expect(element.scrollWidth).withContext(context + '/' + element.className).toBeLessThanOrEqual(element.clientWidth + 1);
          }
          if (width < 768) {
            for (const button of Array.from(doc.querySelectorAll('.view-team'))) {
              const rect = button.getBoundingClientRect();
              const row = button.closest('tr')!;
              expect(rect.height).toBeGreaterThanOrEqual(44);
              expect(rect.top).toBeGreaterThanOrEqual(row.querySelector('.username')!.getBoundingClientRect().bottom);
              expect(rect.width).toBeGreaterThan(row.getBoundingClientRect().width / 2);
            }
            const filters = doc.querySelectorAll('.filters p-select');
            expect(filters[0].getBoundingClientRect().top).toBe(filters[1].getBoundingClientRect().top);
          }
        } finally { frame.remove(); }
      }
    }
  }, 30000);
});
