import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { providePrimeNG } from 'primeng/config';
import { FormulaBolloPreset } from '../../../app.config';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { SeasonApiService } from '../../../../shared/services/api/season-api.service';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { fantasyFixture } from '../fantasy-clasification/fantasy-clasification.fixture';
import { FantasyLoginComponent } from '../fantasy-login/fantasy-login.component';
import { FantasyRegisterComponent } from '../fantasy-register/fantasy-register.component';
import { FantasyRecoverPasswordComponent } from '../fantasy-recover-password/fantasy-recover-password.component';

describe('Fantasy auth responsive layout', () => {
  for (const type of [FantasyLoginComponent, FantasyRegisterComponent, FantasyRecoverPasswordComponent]) {
    it(type.name + ' fits 320–1296px in both themes with readable contrast, 48px fields and 44px targets', async () => {
      const data = fantasyFixture();
      data.entries.forEach(entry => entry.account.username = 'UsuarioConNombreMuyLargoSinEspaciosParaComprobarElPodio' + entry.account.id);
      TestBed.configureTestingModule({
        imports: [type],
        providers: [
          ...provideComponentTesting(),
          providePrimeNG({ theme: { preset: FormulaBolloPreset, options: { darkModeSelector: '.dark', cssLayer: { name: 'primeng', order: 'tailwind, primeng' } } } }),
          { provide: SeasonApiService, useValue: { getSeasonOfFantasy: () => of([{ number: 2 }]) } },
          { provide: FantasyApiService, useValue: { getFantasyClasification: () => of(data) } }
        ]
      });
      const fixture: ComponentFixture<any> = TestBed.createComponent(type as typeof FantasyLoginComponent);
      fixture.detectChanges(); await fixture.whenStable();
      const styles = Array.from(document.styleSheets).flatMap(sheet => {
        try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); } catch { return []; }
      }).join('\n');
      const states = type === FantasyLoginComponent ? ['login', 'recover', 'sent'] : ['form'];
      const luminance = (color: string) => {
        const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
      };
      try {
        for (const state of states) {
          if (type === FantasyLoginComponent) {
            fixture.componentInstance.step.set(state);
            fixture.componentInstance.sentEmail.set('un.correo.muy.largo.para.comprobar.el.panel@subdominio.ejemplo.com');
            fixture.componentInstance.remaining.set(state === 'sent' ? 60 : 0);
          }
          fixture.detectChanges(); await fixture.whenStable();
          for (const dark of [false, true]) {
            for (const width of [320, 390, 767, 768, 1024, 1296]) {
              const frame = document.createElement('iframe');
              Object.assign(frame.style, { width: width + 'px', height: '1200px', border: '0' }); document.body.append(frame);
              try {
                const doc = frame.contentDocument!;
                doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + fixture.nativeElement.outerHTML + '</body>';
                doc.documentElement.classList.toggle('dark', dark); await doc.fonts.ready;
                const context = type.name + '/' + state + '/' + width + '/' + dark;
                expect(doc.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(doc.documentElement.clientWidth);
                for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.auth-layout, .auth-right, .podium, .auth-field, input, button, h1, h2, section'))) {
                  if (!element.getBoundingClientRect().width) continue;
                  expect(element.scrollWidth).withContext(context + '/' + element.tagName + '.' + element.className).toBeLessThanOrEqual(element.clientWidth + 1);
                }
                for (const field of Array.from(doc.querySelectorAll('input'))) expect(field.getBoundingClientRect().height).withContext(context).toBe(48);
                for (const target of Array.from(doc.querySelectorAll<HTMLElement>('button, a'))) {
                  const rect = target.getBoundingClientRect();
                  if (!rect.width) continue;
                  expect(rect.height).withContext(context + '/target/' + target.textContent).toBeGreaterThanOrEqual(44);
                }
                const view = frame.contentWindow!;
                const canvas = view.getComputedStyle(doc.querySelector('.auth-layout')!).backgroundColor;
                for (const selector of ['.auth-heading h1', '.auth-heading > p', '.auth-link']) {
                  for (const element of Array.from(doc.querySelectorAll(selector))) {
                    const foreground = luminance(view.getComputedStyle(element).color);
                    const background = luminance(canvas);
                    expect((Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05)).withContext(context + '/' + selector).toBeGreaterThanOrEqual(4.5);
                  }
                }
                const toggle = doc.querySelector<HTMLElement>('app-fantasy-password-field button');
                if (toggle) {
                  toggle.focus();
                  expect(doc.activeElement).toBe(toggle);
                  expect(view.getComputedStyle(toggle).outlineStyle).not.toBe('none');
                }
              } finally { frame.remove(); }
            }
          }
        }
      } finally { fixture.destroy(); }
    }, 30000);
  }
});
