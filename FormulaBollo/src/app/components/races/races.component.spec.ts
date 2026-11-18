import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { RacesComponent } from './races.component';
import { appConfig } from '../../app.config';
import { Race } from '../../../shared/models/race';
import { Season } from '../../../shared/models/season';

describe('RacesComponent', () => {
  let component: RacesComponent;
  let fixture: ComponentFixture<RacesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RacesComponent],
      providers: [...appConfig.providers, ...provideComponentTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RacesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the lower race list as links to each race and season', async () => {
    const season = new Season(1, 'Temporada de prueba', 2);
    component['races'].set([
      new Race(1, 'Gran Premio', 'flag.png', 'circuit.png', new Date(2026, 0, 1), season, 1),
      new Race(2, 'Otro Circuito', 'flag.png', 'circuit.png', new Date(2026, 0, 2), season, 0),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('.grid a'));
    expect(links.length).toBe(2);
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/results/Gran_Premio/2', '/results/Otro_Circuito/2',
    ]);
    expect(links.map(link => link.textContent)).toEqual([
      jasmine.stringContaining('Gran Premio'), jasmine.stringContaining('Otro Circuito'),
    ]);
  });

  it('shows Completada only on finished carousel races', async () => {
    const season = new Season(1, 'Temporada de prueba', 1);
    component['races'].set([
      new Race(1, 'Terminada', 'flag.png', 'circuit.png', new Date(2026, 0, 1), season, 1),
      new Race(2, 'Pendiente', 'flag.png', 'circuit.png', new Date(2026, 0, 2), season, 0),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.p-carousel-item .group'));
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.some(card => card.textContent!.includes('Terminada'))).toBeTrue();
    expect(cards.some(card => card.textContent!.includes('Pendiente'))).toBeTrue();
    for (const card of cards) {
      const finished = card.textContent!.includes('Terminada');
      expect(card.textContent!.includes('Completada')).toBe(finished);
    }
  });

  it('keeps the 32x8 indicators visible with at least a 24x24 hit area', async () => {
    component['races'].set(Array.from({ length: 6 }, (_, index) => new Race(
      index + 1, `Circuito ${index + 1}`, 'flag.png', 'circuit.png',
      new Date(2026, 0, index + 1), new Season(1, 'Temporada de prueba', 1), 0,
    )));
    fixture.detectChanges();
    await fixture.whenStable();

    const indicators: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.p-carousel-indicator-button'));
    expect(indicators.length).toBeGreaterThan(0);
    for (const indicator of indicators) {
      const visible = indicator.getBoundingClientRect();
      const hitArea = getComputedStyle(indicator, '::after');
      expect(visible.width).toBe(32);
      expect(visible.height).toBe(8);
      expect(parseFloat(hitArea.width)).toBeGreaterThanOrEqual(24);
      expect(parseFloat(hitArea.height)).toBeGreaterThanOrEqual(24);
      expect(hitArea.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    }
  });
});
