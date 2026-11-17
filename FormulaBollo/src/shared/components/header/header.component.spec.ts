import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrimeNG } from 'primeng/config';
import { appConfig } from '../../../app/app.config';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { HeaderComponent } from './header.component';

describe('HeaderComponent accessibility', () => {
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [...appConfig.providers, ...provideComponentTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderComponent);
    fixture.componentInstance.putItemsHeader();
    fixture.detectChanges();
  });

  afterEach(() => fixture?.destroy());

  it('places the menubar inside header and Spanish navigation landmarks', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header).not.toBeNull();
    expect(header.querySelector('nav[aria-label="Navegación principal"] p-menubar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[onkeypress]')).toBeNull();
  });

  it('uses the Spanish PrimeNG navigation translation on the mobile button', () => {
    expect(TestBed.inject(PrimeNG).translation.aria?.navigation).toBe('Navegación');
    expect(fixture.nativeElement.querySelector('.p-menubar-button').getAttribute('aria-label')).toBe('Navegación');
  });

  it('keeps touch targets inside the 64px header at mobile and desktop widths', () => {
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try {
        return Array.from(sheet.cssRules, rule => rule.cssText)
          .filter(rule => !rule.startsWith('@import'));
      } catch {
        return [];
      }
    }).join('\n');

    for (const fantasy of [false, true]) {
      fixture.componentInstance.isFantasy.set(fantasy);
      fixture.componentInstance.putItemsHeader();
      fixture.detectChanges();
      for (const width of [390, 1440]) {
        const frame = document.createElement('iframe');
        frame.style.width = `${width}px`;
        document.body.append(frame);
        try {
          const doc = frame.contentDocument!;
          doc.documentElement.innerHTML = `<head><style>${styles}</style></head><body>${fixture.nativeElement.outerHTML}</body>`;
          const header = doc.querySelector('header')!.getBoundingClientRect();
          expect(header.height).withContext(`${fantasy}/${width}`).toBe(64);
          for (const button of Array.from(doc.querySelectorAll('.p-button, .p-menubar-button'))) {
            const rect = button.getBoundingClientRect();
            if (width >= 768 && button.matches('.p-menubar-button')) continue;
            expect(rect.height).withContext(`${fantasy}/${width}/${button.className}`).toBeGreaterThanOrEqual(width < 768 ? 44 : 36);
            if (width < 768) expect(rect.width).toBeGreaterThanOrEqual(44);
            expect(rect.top).toBeGreaterThanOrEqual(header.top);
            expect(rect.bottom).toBeLessThanOrEqual(header.bottom);
          }
        } finally {
          frame.remove();
        }
      }
    }
  });
});
