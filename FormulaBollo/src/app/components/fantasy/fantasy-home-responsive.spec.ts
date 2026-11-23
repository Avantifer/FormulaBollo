import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { providePrimeNG } from 'primeng/config';
import { FormulaBolloPreset } from '../../app.config';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { AuthJWTService } from '../../../shared/services/authJWT.service';
import { FantasyApiService } from '../../../shared/services/api/fantasy-api.service';
import { RaceApiService } from '../../../shared/services/api/race-api.service';
import { SeasonApiService } from '../../../shared/services/api/season-api.service';
import { FantasyComponent } from './fantasy.component';
import { fantasyFixture } from './fantasy-clasification/fantasy-clasification.fixture';

describe('Fantasy home responsive layout', () => {
  for (const logged of [false, true]) {
    it('fits 320–1296px in both themes with readable text and 44px targets' + (logged ? ' when logged in' : ''), async () => {
      const data = fantasyFixture();
      data.entries.forEach(entry => entry.account.username = 'UsuarioConNombreMuyLargoSinEspaciosParaComprobarLaTabla' + entry.account.id);
      data.races.push(...[5, 6, 7].map(order => ({ id: 30 + order, name: 'Circuito con un nombre larguísimo ' + order, order, finished: false })));
      TestBed.configureTestingModule({
        imports: [FantasyComponent],
        providers: [
          ...provideComponentTesting(),
          providePrimeNG({ theme: { preset: FormulaBolloPreset, options: { darkModeSelector: '.dark', cssLayer: { name: 'primeng', order: 'tailwind, primeng' } } } }),
          { provide: AuthJWTService, useValue: { isLogged: () => logged } },
          { provide: SeasonApiService, useValue: { getSeasonOfFantasy: () => of([{ number: 2 }]) } },
          { provide: FantasyApiService, useValue: { getFantasyClasification: () => of(data) } },
          { provide: RaceApiService, useValue: { getAllRaces: () => of(data.races.map(race => ({ id: race.id, dateStart: '2024-09-01T15:00:00' }))) } }
        ]
      });
      const fixture = TestBed.createComponent(FantasyComponent);
      fixture.detectChanges(); await fixture.whenStable();
      const styles = Array.from(document.styleSheets).flatMap(sheet => {
        try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); } catch { return []; }
      }).join('\n');
      const luminance = (color: string) => {
        const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
      };
      const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
      try {
        for (const dark of [false, true]) {
          for (const width of [320, 390, 767, 768, 1024, 1296]) {
            const frame = document.createElement('iframe');
            Object.assign(frame.style, { width: width + 'px', height: '1200px', border: '0' }); document.body.append(frame);
            try {
              const doc = frame.contentDocument!;
              doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + fixture.nativeElement.outerHTML + '</body>';
              doc.documentElement.classList.toggle('dark', dark); await doc.fonts.ready;
              const context = 'logged=' + logged + '/' + width + '/' + (dark ? 'dark' : 'light');
              expect(doc.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(doc.documentElement.clientWidth);
              for (const element of Array.from(doc.querySelectorAll<HTMLElement>('article, section, table, h1, h2, h3, dl, details, summary, ul, ol'))) {
                if (!element.getBoundingClientRect().width) continue;
                expect(element.scrollWidth).withContext(context + '/' + element.tagName + '/' + element.className.slice(0, 40)).toBeLessThanOrEqual(element.clientWidth + 1);
              }
              for (const target of Array.from(doc.querySelectorAll<HTMLElement>('a, summary'))) {
                const rect = target.getBoundingClientRect();
                if (!rect.width) continue;
                expect(rect.height).withContext(context + '/target/' + target.textContent!.trim().slice(0, 30)).toBeGreaterThanOrEqual(44);
              }
              const view = frame.contentWindow!;
              const canvas = view.getComputedStyle(doc.querySelector('.bg-canvas')!).backgroundColor;
              for (const selector of ['h1', 'header p', 'dl dt']) {
                for (const element of Array.from(doc.querySelectorAll(selector))) {
                  expect(contrast(view.getComputedStyle(element).color, canvas)).withContext(context + '/' + selector).toBeGreaterThanOrEqual(4.5);
                }
              }
              const darkZone = doc.querySelector<HTMLElement>('.zone-dark')!;
              const zoneBackground = view.getComputedStyle(darkZone).backgroundColor;
              for (const element of Array.from(darkZone.querySelectorAll<HTMLElement>('h2, p, span, strong, small'))) {
                if (!element.textContent!.trim() || element.closest('li')) continue;
                expect(contrast(view.getComputedStyle(element).color, zoneBackground)).withContext(context + '/zone/' + element.textContent!.trim().slice(0, 20)).toBeGreaterThanOrEqual(4.5);
              }
              const link = doc.querySelector<HTMLElement>('a.go')!;
              link.focus();
              expect(doc.activeElement).toBe(link);
              expect(view.getComputedStyle(link).outlineStyle).not.toBe('none');
            } finally { frame.remove(); }
          }
        }
      } finally { fixture.destroy(); }
    }, 60000);
  }
});
