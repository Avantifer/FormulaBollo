import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
import { Race } from '../../../../shared/models/race';
import { environment } from '../../../../enviroments/enviroment';
import { AdminPricesComponent } from './admin-prices.component';

describe('Admin prices layout and accessibility', () => {
  it('fits 375px in light and dark, labels every price and announces errors', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPricesComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: RaceApiService, useValue: { getAllRaces: () => NEVER } },
        { provide: FantasyApiService, useValue: { getAdminPrices: () => of({
          drivers: [{ id: 1, name: 'PilotoConUnNombreExtremadamenteLargoSinEspacios', storedPrice: null, suggestedPrice: 30_000_000 }],
          teams: [{ id: 2, name: 'Escudería de prueba', storedPrice: null, suggestedPrice: null }],
        }) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminPricesComponent);
    try {
      fixture.componentInstance.onRaceChange(new Race(1, 'GP', '', '', new Date(), environment.seasonActual, 0));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.componentInstance.touch(fixture.componentInstance.groups()[1].rows[0]);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      for (const input of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="number"]'))) {
        expect(root.querySelector(`label[for="${input.id}"]`)).toBeTruthy();
        const error = root.querySelector('#' + input.getAttribute('aria-describedby')!.split(' ')[1]);
        expect(error?.getAttribute('aria-live')).toBe('polite');
      }
      expect(root.querySelector('#teams-2')?.getAttribute('aria-invalid')).toBe('true');
      const styles = Array.from(document.styleSheets).flatMap(sheet => {
        try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
        catch { return []; }
      }).join('\n');
      for (const dark of [false, true]) {
        const frame = document.createElement('iframe');
        Object.assign(frame.style, { width: '375px', height: '1000px', border: '0' });
        document.body.append(frame);
        try {
          const doc = frame.contentDocument!;
          doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + root.outerHTML + '</body>';
          doc.documentElement.classList.toggle('dark', dark);
          const context = dark ? 'dark/375' : 'light/375';
          expect(doc.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(375);
          const panel = doc.querySelector('section')!;
          expect(frame.contentWindow!.getComputedStyle(panel).backgroundColor)
            .withContext(context).toBe(dark ? 'rgb(29, 33, 39)' : 'rgb(255, 255, 255)');
          for (const input of Array.from(doc.querySelectorAll('input[type="number"]'))) {
            expect(input.getBoundingClientRect().right).withContext(context).toBeLessThanOrEqual(375);
            expect(input.getBoundingClientRect().width).withContext(context).toBeGreaterThan(150);
          }
        } finally { frame.remove(); }
      }
    } finally { fixture.destroy(); }
  });
});
