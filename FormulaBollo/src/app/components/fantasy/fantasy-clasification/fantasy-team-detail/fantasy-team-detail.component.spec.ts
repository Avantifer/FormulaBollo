import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../../../../testing/component-test-providers';
import { ImageService } from '../../../../../shared/services/image.service';
import { buildFantasySeason, fantasyStandings, fantasyTeamDetail } from '../fantasy-clasification.helpers';
import { fantasyFixture } from '../fantasy-clasification.fixture';
import { FantasyTeamDetailComponent } from './fantasy-team-detail.component';

describe('FantasyTeamDetailComponent', () => {
  let fixture: ComponentFixture<FantasyTeamDetailComponent>;
  const root = (): HTMLElement => fixture.nativeElement;
  const detail = () => {
    const season = buildFantasySeason(fantasyFixture());
    return fantasyTeamDetail(season, fantasyStandings(season, 25), 1, 25)!;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FantasyTeamDetailComponent], providers: provideComponentTesting() }).compileComponents();
    spyOn(TestBed.inject(ImageService), 'getImageUrl').and.returnValue('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    fixture = TestBed.createComponent(FantasyTeamDetailComponent);
    fixture.componentRef.setInput('detail', detail()); fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  it('renders 3 drivers and 2 teams in slot order, with images, points and shares', () => {
    expect(root().querySelectorAll('[data-kind="driver"]').length).toBe(3);
    expect(root().querySelectorAll('[data-kind="team"]').length).toBe(2);
    expect(Array.from(root().querySelectorAll('.pick-score b'), el => el.textContent)).toEqual(['0', '18', '8', '14', '11']);
    expect(Array.from(root().querySelectorAll('.order'), el => el.textContent)).toEqual(['#1', '#2', '#3', '#1', '#2']);
    expect(root().textContent).toContain('Pilotos seleccionados');
    expect(root().textContent).toContain('35,3 % del total');
    expect(root().querySelectorAll('img.car').length).toBe(2);
    expect(root().querySelector('[aria-label="Dani Calde: sin foto"]')!.textContent).toBe('DC');
    root().querySelector('img.photo')!.dispatchEvent(new Event('error')); fixture.detectChanges();
    expect(root().querySelector('[aria-label="Juanudi: sin foto"]')!.textContent).toBe('JU');
    expect(root().querySelectorAll('img.photo').length).toBe(1);
  });

  it('provides chart values, distinguishes zero from no election, and splits mobile charts into at most 11 bars', () => {
    const team = detail();
    expect(root().querySelector('div.sr-only > table caption')!.textContent).toContain('user1');
    expect(root().querySelectorAll('div.sr-only tbody tr').length).toBe(3);
    expect(root().querySelectorAll('.active-race').length).toBe(1);
    expect(root().querySelector('.unplayed title')!.textContent).toContain('sin elección');
    team.chart = Array.from({ length: 22 }, (_, index) => ({ ...team.chart[0], raceId: index }));
    fixture.componentRef.setInput('detail', team); fixture.componentRef.setInput('mobile', true); fixture.detectChanges();
    expect(root().querySelectorAll('svg').length).toBe(2);
    expect(fixture.componentInstance.graph().every(chart => chart.bars.length <= 11)).toBeTrue();
  });

  it('emits close and shows the unselected state', () => {
    const closed = jasmine.createSpy('closed'); fixture.componentInstance.closed.subscribe(closed);
    root().querySelector<HTMLButtonElement>('.detail-close')!.click(); expect(closed).toHaveBeenCalled();
    fixture.componentRef.setInput('detail', null); fixture.detectChanges();
    expect(root().textContent).toContain('Elige un usuario para ver su equipo');
  });

  it('LAYOUT keeps the mobile detail inside 320px with long names in both themes', async () => {
    const team = detail(); team.drivers[0].name = 'PilotoConUnNombreMuyLargoSinEspaciosParaComprobar';
    fixture.componentRef.setInput('detail', team); fixture.componentRef.setInput('mobile', true); fixture.detectChanges(); await fixture.whenStable();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); } catch { return []; }
    }).join('\n');
    const frame = document.createElement('iframe'); Object.assign(frame.style, { width: '320px', height: '1200px', border: '0' }); document.body.append(frame);
    try {
      const doc = frame.contentDocument!;
      doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + root().outerHTML + '</body>';
      for (const dark of [false, true]) {
        doc.documentElement.classList.toggle('dark', dark); await doc.fonts.ready;
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth);
        for (const card of Array.from(doc.querySelectorAll<HTMLElement>('.pick'))) expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
        expect(doc.querySelector('.detail-close')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      }
    } finally { frame.remove(); }
  });
});
