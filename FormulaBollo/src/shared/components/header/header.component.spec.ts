import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Event as RouterEvent, NavigationCancel, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { appConfig } from '../../../app/app.config';
import { SUCCESS_LOGOUT } from '../../../app/constants';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { AuthJWTService } from '../../services/authJWT.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { ThemeService } from '../../services/theme.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent navigation and layout', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let router: Router;
  let url: jasmine.Spy;
  let admin: jasmine.Spy;
  let logged: jasmine.Spy;

  function render(route: string, isAdmin = false, isLogged = false): void {
    admin.and.returnValue(isAdmin);
    logged.and.returnValue(isLogged);
    url.and.returnValue(route);
    (router.events as Subject<NavigationEnd>).next(new NavigationEnd(1, route, route));
    fixture.detectChanges();
  }

  function nav(label: string): HTMLElement {
    return fixture.nativeElement.querySelector(`nav[aria-label="${label}"]`);
  }

  function expectLinks(navigation: HTMLElement, links: [string, string][]): void {
    expect(Array.from(navigation.querySelectorAll('a'), link => [link.textContent!.trim(), link.getAttribute('href')]))
      .toEqual(links);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, Toast],
      providers: [...appConfig.providers, ...provideComponentTesting()],
    }).compileComponents();
    router = TestBed.inject(Router);
    url = spyOnProperty(router, 'url', 'get').and.returnValue('/drivers');
    admin = spyOn(TestBed.inject(AuthJWTService), 'checkAdmin').and.returnValue(false);
    logged = spyOn(TestBed.inject(AuthJWTService), 'isLogged').and.returnValue(false);
    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.clear();
  });

  it('recalculates navigation initially and only on NavigationEnd, including JWT checks and the dock', () => {
    expect(admin).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalledTimes(1);
    const fantasy = spyOn(fixture.componentInstance, 'checkIsFantasy').and.callThrough();
    const items = spyOn(fixture.componentInstance, 'putItemsHeader').and.callThrough();
    const dock = spyOn(fixture.componentInstance, 'showBottomDock').and.callThrough();
    url.and.returnValue('/fantasy/team');
    fixture.componentInstance.bottomDockHidden.set(true);
    const events = router.events as Subject<RouterEvent>;
    events.next(new NavigationStart(2, '/fantasy/team'));
    events.next(new NavigationCancel(2, '/fantasy/team', 'cancelled'));
    expect(fantasy).not.toHaveBeenCalled();
    expect(items).not.toHaveBeenCalled();
    expect(dock).not.toHaveBeenCalled();
    expect(admin).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.isFantasy()).toBeFalse();
    expect(fixture.componentInstance.isActive('/drivers')).toBeTrue();
    expect(fixture.componentInstance.bottomDockHidden()).toBeTrue();
    events.next(new NavigationEnd(3, '/fantasy/team', '/fantasy/team'));
    expect(fantasy).toHaveBeenCalledTimes(1);
    expect(items).toHaveBeenCalledTimes(1);
    expect(dock).toHaveBeenCalledTimes(1);
    expect(admin).toHaveBeenCalledTimes(2);
    expect(logged).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.isFantasy()).toBeTrue();
    expect(fixture.componentInstance.isActive('/fantasy/team')).toBeTrue();
    expect(fixture.componentInstance.bottomDockHidden()).toBeFalse();
  });

  it('contains both Spanish navigation landmarks and an accessible logo link without a menubar', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header.querySelector('nav[aria-label="Navegación principal"] ul')).not.toBeNull();
    expect(header.querySelector('nav[aria-label="Navegación inferior"] ul')).not.toBeNull();
    expect(header.querySelector('p-menubar')).toBeNull();
    expect(header.querySelector('a.header-logo').getAttribute('href')).toBe('/home');
    expect(header.querySelector('a.header-logo img').getAttribute('alt')).toBe('Logo FormulaBollo');
    expect(header.querySelector('[onkeypress]')).toBeNull();
  });

  it('renders league routes, restricts administration to admins and marks the current route', () => {
    const links: [string, string][] = [
      ['Pilotos', '/drivers'], ['Escuderías', '/teams'], ['Resultados', '/results'],
      ['Estatuto', '/statute'], ['Estadísticas', '/statistics'],
    ];
    const mobileLinks: [string, string][] = [
      ['Pilotos', '/drivers'], ['Escuderías', '/teams'], ['Resultados', '/results'],
      ['Estatuto', '/statute'], ['Estadísticas', '/statistics'],
    ];
    for (const label of ['Navegación principal', 'Navegación inferior']) {
      expectLinks(nav(label), label === 'Navegación principal' ? links : mobileLinks);
      expect(nav(label).querySelector('a[aria-current="page"]')!.getAttribute('href')).toBe('/drivers');
    }
    expect(Array.from(nav('Navegación inferior').querySelectorAll('a'), link => link.getAttribute('aria-label')))
      .toEqual(links.map(([label]) => label));
    render('/admin/users', true);
    expectLinks(nav('Navegación principal'), [...links, ['Administración', '/admin']]);
    expectLinks(nav('Navegación inferior'), [
      ['Pilotos', '/drivers'], ['Escud.', '/teams'], ['Result.', '/results'], ['Estatuto', '/statute'],
      ['Estad.', '/statistics'], ['Admin', '/admin'],
    ]);
    expect(Array.from(nav('Navegación inferior').querySelectorAll('a'), link => link.getAttribute('aria-label')))
      .toEqual([...links.map(([label]) => label), 'Administración']);
    for (const label of ['Navegación principal', 'Navegación inferior']) {
      expect(nav(label).querySelector('a[aria-current="page"]')!.getAttribute('href')).toBe('/admin');
    }
    render('/results/1');
    expect(nav('Navegación principal').querySelector('[href="/admin"]')).toBeNull();
    expect(nav('Navegación principal').querySelector('[aria-current="page"]')!.getAttribute('href')).toBe('/results');
  });

  it('renders Fantasy routes and login when signed out', () => {
    render('/fantasy/team/1');
    for (const label of ['Navegación principal', 'Navegación inferior']) {
      expectLinks(nav(label), [
        ['Tu equipo', '/fantasy/team'], ['Clasificación', '/fantasy/clasification'], ['Iniciar sesión', '/fantasy/login'],
      ]);
      expect(nav(label).querySelector('[aria-current="page"]')!.getAttribute('href')).toBe('/fantasy/team');
      expect(nav(label).querySelector('button')).toBeNull();
    }
    expect(fixture.nativeElement.querySelector('.header-logo').getAttribute('href')).toBe('/fantasy');
  });

  it('uses a logout button in both navigations and executes the session action', async () => {
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const success = spyOn(TestBed.inject(MessageInfoService), 'showSuccess');
    for (const label of ['Navegación principal', 'Navegación inferior']) {
      render('/fantasy/clasification', false, true);
      localStorage.setItem('auth', 'session');
      const button = nav(label).querySelector('button')!;
      expect(button.textContent!.trim()).toBe('Cerrar sesión');
      expect(button.getAttribute('type')).toBe('button');
      expect(button.hasAttribute('href')).toBeFalse();
      expect(nav(label).querySelector('[href="/fantasy/login"]')).toBeNull();
      const calls = logged.calls.count();
      button.click();
      await fixture.whenStable();
      expect(localStorage.getItem('auth')).toBeNull();
      expect(logged.calls.count()).toBeGreaterThan(calls);
      expect(success).toHaveBeenCalledWith(SUCCESS_LOGOUT);
      expect(navigate).toHaveBeenCalledWith(['fantasy/login']);
      render('/fantasy/login');
      expect(nav(label).querySelector('[aria-current="page"]')!.textContent!.trim()).toBe('Iniciar sesión');
    }
  });

  it('provides both mode destinations and marks only the selected mode', () => {
    for (const fantasy of [false, true]) {
      render(fantasy ? '/fantasy/team' : '/drivers');
      const group = fixture.nativeElement.querySelector('[role="group"][aria-label="Modo de la web"]');
      expect(Array.from(group.querySelectorAll('a'), (link: any) => link.getAttribute('href'))).toEqual(['/', '/fantasy']);
      expect(group.querySelectorAll('[aria-current="page"]').length).toBe(1);
      expect(group.querySelector('[aria-current="page"]').getAttribute('href')).toBe(fantasy ? '/fantasy' : '/');
    }
  });

  it('preserves the theme button action and accessible label', () => {
    const theme = TestBed.inject(ThemeService);
    const toggle = spyOn(theme, 'toggleTheme').and.callThrough();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.header-button button');
    const label = button.getAttribute('aria-label');
    expect(label).toMatch(/^Cambiar a modo (claro|oscuro)$/);
    button.click();
    fixture.detectChanges();
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(button.getAttribute('aria-label')).not.toBe(label);
  });

  describe('bottom dock scroll visibility', () => {
    let scrollY: jasmine.Spy;

    function scrollTo(y: number): void {
      scrollY.and.returnValue(y);
      window.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
    }

    function expectHidden(hidden: boolean): void {
      expect(nav('Navegación inferior').classList.contains('header-bottom--hidden')).toBe(hidden);
    }

    beforeEach(() => {
      scrollY = spyOnProperty(window, 'scrollY', 'get').and.returnValue(100);
      spyOnProperty(window, 'innerHeight', 'get').and.returnValue(800);
      spyOnProperty(document.documentElement, 'scrollHeight', 'get').and.returnValue(2000);
      fixture.componentInstance.showBottomDock();
    });

    it('always shows the dock at the start of the page', () => {
      scrollTo(120);
      expectHidden(true);
      scrollTo(0);
      expectHidden(false);
    });

    it('hides after consecutive downward movements accumulate twelve pixels', () => {
      scrollTo(105);
      expectHidden(false);
      scrollTo(113);
      expectHidden(true);
    });

    it('shows after consecutive upward movements accumulate eight pixels', () => {
      scrollTo(120);
      expectHidden(true);
      scrollTo(116);
      expectHidden(true);
      scrollTo(111);
      expectHidden(false);
    });

    it('stays visible for small movements and resets the accumulation on reversal', () => {
      scrollTo(110);
      expectHidden(false);
      scrollTo(109);
      scrollTo(119);
      expectHidden(false);
    });

    it('shows at the bottom edge even while scrolling down', () => {
      scrollTo(120);
      expectHidden(true);
      scrollTo(1192);
      expectHidden(false);
      scrollTo(1200);
      expectHidden(false);
    });

    it('shows when focus enters a control inside the dock', () => {
      scrollTo(120);
      expectHidden(true);
      nav('Navegación inferior').querySelector('a')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();
      expectHidden(false);
      scrollTo(121);
      expectHidden(false);
    });

    it('shows and resets the accumulation on NavigationEnd', () => {
      scrollTo(120);
      expectHidden(true);
      render('/results');
      expectHidden(false);
      scrollTo(121);
      expectHidden(false);
    });

    it('stops listening to scroll after destruction', () => {
      fixture.destroy();
      scrollY.and.returnValue(120);
      window.dispatchEvent(new Event('scroll'));
      expect(fixture.componentInstance.bottomDockHidden()).toBeFalse();
    });
  });

  it('keeps header text contrast above 4.5 in both modes and themes', () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    const luminance = (color: string, background: string): number => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = background;
      context.fillRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const rgb = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map(channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const wasDark = document.documentElement.classList.contains('dark');
    try {
      for (const dark of [false, true]) {
        for (const fantasy of [false, true]) {
          render(fantasy ? '/fantasy/team' : '/drivers', !fantasy);
          document.documentElement.classList.toggle('dark', dark);
          const pit = getComputedStyle(fixture.nativeElement.querySelector('header')).getPropertyValue('--pit');
          for (const target of Array.from(fixture.nativeElement.querySelectorAll('.header-link, .header-tab, .mode-switch a, .header-button button')) as HTMLElement[]) {
            const style = getComputedStyle(target);
            const background = target.closest('.mode-switch') && target.hasAttribute('aria-current') ? style.backgroundColor : pit;
            const ink = luminance(style.color, background);
            const surface = luminance(background, pit);
            expect((Math.max(ink, surface) + 0.05) / (Math.min(ink, surface) + 0.05))
              .withContext(`${dark}/${fantasy}/${target.textContent}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    } finally {
      document.documentElement.classList.toggle('dark', wasDark);
    }
  });

  it('measures responsive docks, touch targets, labels and overlay stacking in both modes', async () => {
    const toast = TestBed.createComponent(Toast);
    toast.detectChanges();
    TestBed.inject(MessageService).add({ severity: 'success', detail: 'Cabecera comprobada', sticky: true });
    await toast.whenStable();
    toast.detectChanges();
    const copyRules = (sheet: CSSStyleSheet): string[] => {
      try {
        return Array.from(sheet.cssRules).flatMap(rule => {
          if (rule instanceof CSSImportRule) {
            return rule.styleSheet ? copyRules(rule.styleSheet) : [];
          }
          // CSS copied into an about:blank iframe must keep the parent sheet's
          // asset URLs, including Karma's emitted local font files.
          return rule.cssText.replace(/url\(["']?([^"')]+)["']?\)/g,
            (_, url: string) => `url("${new URL(url, sheet.href ?? document.baseURI).href}")`);
        });
      } catch {
        return [];
      }
    };
    const styles = Array.from(document.styleSheets).flatMap(copyRules).join('\n');

    try {
      for (const fantasy of [false, true]) {
        for (const signedIn of fantasy ? [false, true] : [false]) {
          for (const showAdmin of fantasy ? [false] : [false, true]) {
          render(fantasy ? '/fantasy/team' : '/drivers', showAdmin, signedIn);
          for (const width of [320, 360, 390, 768, 1440]) {
            const frame = document.createElement('iframe');
            frame.style.width = `${width}px`;
            frame.style.height = '800px';
            frame.style.border = '0';
            document.body.append(frame);
            try {
              const doc = frame.contentDocument!;
              doc.documentElement.innerHTML = `<head><style>${styles}</style></head><body>${fixture.nativeElement.outerHTML}${toast.nativeElement.outerHTML}</body>`;
              const loadedFonts = await doc.fonts.load('600 11px "Barlow Condensed"', 'PILOTOS ESCUDERÍAS RESULTADOS ESTATUTO ESTADÍSTICAS');
              await doc.fonts.load('700 14px "Barlow Condensed"', 'LIGA FANTASY');
              await doc.fonts.load('400 16px "Geist Variable"');
              await doc.fonts.ready;
              expect(loadedFonts.length).withContext('Local Barlow Condensed must load in every iframe').toBeGreaterThan(0);
              expect(loadedFonts.every(font => font.status === 'loaded')).toBeTrue();
              const view = frame.contentWindow!;
              const header = doc.querySelector('header')!.getBoundingClientRect();
              const top = doc.querySelector<HTMLElement>('.header-top')!;
              const topRect = top.getBoundingClientRect();
              const topStyle = view.getComputedStyle(top);
              const desktop = doc.querySelector<HTMLElement>('nav[aria-label="Navegación principal"]')!;
              const bottom = doc.querySelector<HTMLElement>('nav[aria-label="Navegación inferior"]')!;
              const tabs = Array.from(bottom.querySelectorAll<HTMLElement>('a, button'));
              const context = `${fantasy ? 'Fantasy' : showAdmin ? 'Liga admin' : 'Liga usuario'}/${signedIn}/${width}`;
              const modeSwitch = doc.querySelector('.mode-switch')!.getBoundingClientRect();
              const themeButton = doc.querySelector('.header-button .p-button')!.getBoundingClientRect();
              const themeHost = doc.querySelector('.header-button')!.getBoundingClientRect();
              const controlSize = width < 768 ? 44 : 36;
              expect(Math.abs(modeSwitch.height - controlSize)).withContext(context).toBeLessThanOrEqual(0.5);
              expect(Math.abs(themeButton.height - controlSize)).withContext(context).toBeLessThanOrEqual(0.5);
              expect(Math.abs(modeSwitch.height - themeButton.height)).withContext(context).toBeLessThanOrEqual(0.5);
              expect(Math.abs(themeButton.width - themeButton.height)).withContext(context).toBeLessThanOrEqual(0.5);
              expect(Math.abs(modeSwitch.top - themeButton.top)).withContext(context).toBeLessThanOrEqual(0.5);
              expect(Math.abs(modeSwitch.bottom - themeButton.bottom)).withContext(context).toBeLessThanOrEqual(0.5);
              expect(Math.abs(themeHost.width - themeButton.width)).withContext(context).toBeLessThanOrEqual(0.5);
              expect(Math.abs(themeHost.height - themeButton.height)).withContext(context).toBeLessThanOrEqual(0.5);
              expect(header.height).withContext(context).toBe(width < 768 ? 76 : 64);
              expect(view.getComputedStyle(desktop).display).withContext(context).toBe(width < 768 ? 'none' : 'block');
              expect(view.getComputedStyle(bottom).display).withContext(context).toBe(width < 768 ? 'block' : 'none');
              if (width < 768) {
                expect(topRect.height).withContext(context).toBe(60);
                expect(topRect.left).toBe(8);
                expect(width - topRect.right).toBe(8);
                expect(topRect.top).toBe(8);
                expect(header.bottom - topRect.bottom).toBe(8);
                expect(topStyle.paddingLeft).toBe('8px');
                expect(topStyle.borderTopWidth).toBe('1px');
                expect(topStyle.borderBottomWidth).toBe('2px');
                expect(topStyle.borderRadius).toBe('6px');
                expect(topStyle.borderBottomColor).toBe(fantasy ? 'rgb(37, 99, 235)' : 'rgb(225, 6, 0)');
                expect(view.getComputedStyle(doc.querySelector('header')!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
                const logo = doc.querySelector('.header-logo img')!.getBoundingClientRect();
                expect(logo.height).toBe(40);
                expect(logo.width).toBeCloseTo(40 * (1140 / 584), 0);
                expect(themeButton.left - modeSwitch.right).toBe(8);
                const bottomRect = bottom.getBoundingClientRect();
                const bottomStyle = view.getComputedStyle(bottom);
                expect(bottomRect.height).withContext(context).toBe(60);
                expect(bottomStyle.position).toBe('fixed');
                expect(bottomRect.left).toBe(8);
                expect(width - bottomRect.right).toBe(8);
                expect(view.innerHeight - bottomRect.bottom).toBe(8);
                expect(bottomStyle.borderRadius).toBe('6px');
                for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
                  expect(bottomStyle.getPropertyValue(`border-${side.toLowerCase()}-width`)).toBe('1px');
                }
                expect(bottomStyle.borderTopColor).toBe('rgba(255, 255, 255, 0.18)');
                if (width === 390) {
                  expect(bottomStyle.transform).toBe('none');
                  fixture.componentInstance.bottomDockHidden.set(true);
                  fixture.detectChanges();
                  bottom.className = nav('Navegación inferior').className;
                  // Finish any CSS transition before measuring its final position.
                  view.getComputedStyle(bottom).transform;
                  bottom.getAnimations().forEach(animation => animation.finish());
                  expect(bottom.getBoundingClientRect().top).withContext(context).toBeGreaterThanOrEqual(view.innerHeight);
                  expect(view.getComputedStyle(bottom).visibility).toBe('visible');
                  fixture.componentInstance.showBottomDock();
                  fixture.detectChanges();
                  bottom.className = nav('Navegación inferior').className;
                  view.getComputedStyle(bottom).transform;
                  bottom.getAnimations().forEach(animation => animation.finish());
                  const restored = bottom.getBoundingClientRect();
                  expect(restored.left).toBe(8);
                  expect(view.innerWidth - restored.right).toBe(8);
                  expect(view.innerHeight - restored.bottom).toBe(8);
                  expect(restored.height).toBe(60);
                  expect(view.getComputedStyle(bottom).transform).toBe('none');
                }
                const active = bottom.querySelector<HTMLElement>('[aria-current="page"]')!;
                const activeFill = view.getComputedStyle(active, '::before');
                expect(activeFill.backgroundColor).toBe('rgba(255, 255, 255, 0.1)');
                expect(activeFill.height).toBe('52px');
                expect(activeFill.borderRadius).toBe('4px');
                expect(activeFill.left).toBe('4px');
                expect(activeFill.right).toBe('4px');
                expect(active.getBoundingClientRect().top - bottomRect.top).toBe(4);
                expect(bottomRect.bottom - active.getBoundingClientRect().bottom).toBe(4);
                expect(view.getComputedStyle(active).color).toBe(fantasy ? 'rgb(110, 160, 255)' : 'rgb(255, 93, 82)');
                const overlay = doc.querySelector<HTMLElement>('.p-toast')!;
                expect(Number(view.getComputedStyle(overlay).zIndex)).toBeGreaterThan(Number(view.getComputedStyle(bottom).zIndex));
                for (const target of Array.from(doc.querySelectorAll<HTMLElement>('.header-logo, .mode-switch a, .header-button button, .header-bottom a, .header-bottom button'))) {
                  const rect = target.getBoundingClientRect();
                  expect(rect.height).withContext(`${context}/${target.textContent}`).toBeGreaterThanOrEqual(44);
                  expect(rect.width).withContext(`${context}/${target.textContent}`).toBeGreaterThanOrEqual(44);
                  if (target.closest('.header-top')) {
                    expect(rect.top).toBeGreaterThanOrEqual(header.top);
                    expect(rect.bottom).toBeLessThanOrEqual(header.bottom);
                  }
                }
                expect(tabs.length).toBe(fantasy ? 3 : showAdmin ? 6 : 5);
                for (const tab of tabs) {
                  expect(tab.getBoundingClientRect().width).withContext(context).toBeCloseTo((width - 18) / tabs.length, 1);
                  expect(tab.getBoundingClientRect().height).withContext(context).toBe(52);
                  expect(view.getComputedStyle(tab.querySelector('.pi')!).fontSize).toBe('22px');
                }
                const labels = Array.from(bottom.querySelectorAll<HTMLElement>('.tab-label'));
                for (const text of labels) {
                  expect(view.getComputedStyle(text).fontFamily).toContain('Barlow Condensed');
                  expect(text.scrollWidth).withContext(`${context}/${text.textContent}`).toBeLessThanOrEqual(text.clientWidth);
                }
                if (!fantasy && !showAdmin) {
                  console.info('HEADER_LABEL_MEASUREMENTS', JSON.stringify({ width,
                    labels: labels.map(text => ({ text: text.textContent, scrollWidth: text.scrollWidth, clientWidth: text.clientWidth })) }));
                }
              } else {
                expect(header.left).toBe(0);
                expect(header.width).toBe(width);
                expect(topRect.left).toBe(0);
                expect(topRect.top).toBe(0);
                expect(topRect.width).toBe(width);
                expect(topStyle.borderRadius).toBe('0px');
                expect(topStyle.borderTopWidth).toBe('0px');
                expect(view.getComputedStyle(doc.querySelector('header')!).borderBottomWidth).toBe('2px');
                for (const target of Array.from(desktop.querySelectorAll<HTMLElement>('a, button'))) {
                  expect(target.getBoundingClientRect().height).withContext(context).toBeGreaterThanOrEqual(36);
                }
                expect(desktop.getBoundingClientRect().right).withContext(context).toBeLessThanOrEqual(doc.querySelector('.mode-switch')!.getBoundingClientRect().left);
                expect(desktop.querySelector('li:last-child')!.getBoundingClientRect().right).withContext(context).toBeLessThanOrEqual(doc.querySelector('.mode-switch')!.getBoundingClientRect().left);
              }
              expect(doc.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(width);
              console.info('HEADER_LAYOUT', JSON.stringify({ mode: fantasy ? 'Fantasy' : showAdmin ? 'Liga admin' : 'Liga usuario', signedIn, width,
                header: header.height, top: topRect.height, bottom: bottom.getBoundingClientRect().height,
                topInsets: { left: topRect.left, right: width - topRect.right, top: topRect.top },
                bottomInsets: { left: bottom.getBoundingClientRect().left, right: width - bottom.getBoundingClientRect().right,
                  bottom: view.innerHeight - bottom.getBoundingClientRect().bottom },
                modeSwitch: modeSwitch.height, themeButton: { width: themeButton.width, height: themeButton.height },
                controlTop: { modeSwitch: modeSwitch.top, themeButton: themeButton.top },
                controlBottom: { modeSwitch: modeSwitch.bottom, themeButton: themeButton.bottom },
                desktop: view.getComputedStyle(desktop).display, tabs: tabs.map(tab => tab.getBoundingClientRect().width) }));
            } finally {
              frame.remove();
            }
          }
          }
        }
      }
    } finally {
      toast.destroy();
    }
  });
});
