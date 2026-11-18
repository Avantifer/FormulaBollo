import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting, driverPointsFixture } from '../../../../../testing/component-test-providers';
import { Top3DriversComponent } from './top3-drivers.component';

describe('Top3DriversComponent', () => {
  let component: Top3DriversComponent;
  let fixture: ComponentFixture<Top3DriversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top3DriversComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(Top3DriversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the podium order and readable position contrast in both themes', () => {
    fixture.componentRef.setInput('top3', [driverPointsFixture, driverPointsFixture, driverPointsFixture]);
    fixture.detectChanges();

    const luminance = (color: string): number => {
      const channels = color.match(/[\d.]+/g)!.map(Number);
      expect(channels.length).toBeGreaterThanOrEqual(3);
      expect(channels[3] ?? 1).withContext(`opaque color: ${color}`).toBe(1);
      const [r, g, b] = channels.slice(0, 3).map(channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const badges: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[data-testid="podium-position"]'));
    expect(badges.length).toBe(3);
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    try {
      for (const dark of [false, true]) {
        root.classList.toggle('dark', dark);
        badges.forEach((badge, index) => {
          expect(badge.textContent?.trim()).toBe(['2º', '1º', '3º'][index]);
          const style = getComputedStyle(badge);
          const foreground = luminance(style.color);
          const background = luminance(style.backgroundColor);
          const contrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
          expect(contrast).withContext(`badge ${index}, ${dark ? 'dark' : 'light'} theme`).toBeGreaterThanOrEqual(4.5);
        });
      }
    } finally {
      root.classList.toggle('dark', wasDark);
    }
  });
});
