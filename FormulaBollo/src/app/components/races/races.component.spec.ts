import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
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
