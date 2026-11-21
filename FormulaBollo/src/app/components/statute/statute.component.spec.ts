import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Event as RouterEvent, NavigationEnd, Router, Scroll } from '@angular/router';
import { of, Subject } from 'rxjs';
import { appConfig } from '../../app.config';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { StatuteComponent } from './statute.component';
import { STATUTE } from './statute.data';

describe('StatuteComponent', () => {
  let fixture: ComponentFixture<StatuteComponent>;
  let component: StatuteComponent;
  let observer: IntersectionObserver;
  let notify: IntersectionObserverCallback;
  let observerOptions: IntersectionObserverInit | undefined;
  let navigate: jasmine.Spy;
  let scroll: jasmine.Spy;

  const sections = [STATUTE.preamble, ...STATUTE.sections];
  const articles = STATUTE.sections.flatMap(section => section.articles);
  const sectionIds = [...sections.map(section => section.id), 'disposicion-final'];
  const root = (): HTMLElement => fixture.nativeElement;
  const query = <T extends HTMLElement = HTMLElement>(selector: string): T => root().querySelector<T>(selector)!;
  const normalize = (text: string | null): string => (text ?? '').replace(/\s+/g, ' ').trim();

  async function render(fragment: string | null = null): Promise<void> {
    TestBed.inject(ActivatedRoute).fragment = of(fragment);
    fixture = TestBed.createComponent(StatuteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatuteComponent, HeaderComponent],
      providers: [...appConfig.providers, ...provideComponentTesting()]
    }).compileComponents();
    observer = {
      observe: jasmine.createSpy('observe'),
      disconnect: jasmine.createSpy('disconnect'),
      unobserve: jasmine.createSpy('unobserve'),
      takeRecords: () => [],
      root: null,
      rootMargin: '',
      thresholds: [0]
    };
    spyOn(window, 'IntersectionObserver').and.callFake(function(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      notify = callback;
      observerOptions = options;
      return observer;
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    scroll = spyOn(HTMLElement.prototype, 'scrollIntoView');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('renders one visible official heading, calculated figures and the safe PDF download', async () => {
    await render();
    expect(root().querySelectorAll('h1').length).toBe(1);
    const heading = query('h1');
    expect(normalize(heading.textContent)).toBe('Estatuto oficial');
    expect(heading.classList.contains('sr-only')).toBeFalse();
    expect(getComputedStyle(heading).display).not.toBe('none');
    expect(query('.pit-subtitle').textContent).toBe(STATUTE.subtitle);
    expect(Array.from(root().querySelectorAll('dd'), element => normalize(element.textContent)))
      .toEqual([String(STATUTE.sections.length), String(articles.length)]);
    const link = query<HTMLAnchorElement>('a[download]');
    expect(link.getAttribute('href')).toBe('/assets/archives/estatutoF1Bollo.pdf');
    expect(link.hasAttribute('download')).toBeTrue();
    expect(link.target).toBe('_blank');
    expect(link.relList.contains('noopener')).toBeTrue();
    expect(link.relList.contains('noreferrer')).toBeTrue();
    expect(normalize(link.textContent)).toBe('Descargar PDF');
    expect(root().querySelector('object')).toBeNull();
  });

  it('shares the complete index between responsive navigation and gives every document block a unique id', async () => {
    await render();
    const navigations = root().querySelectorAll('nav[aria-label="Indice del estatuto"]');
    expect(navigations.length).toBe(2);
    for (const nav of Array.from(navigations)) {
      expect(Array.from(nav.querySelectorAll('a'), link => link.getAttribute('href')))
        .toEqual(sectionIds.map(id => '#' + id));
      expect(nav.querySelectorAll('a').length).toBe(10);
    }
    expect(Array.from(root().querySelectorAll('section'), element => element.id)).toEqual(sectionIds);
    const ids = Array.from(root().querySelectorAll('[id]'), element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(query<HTMLDetailsElement>('details').open).toBeFalse();
    for (const section of sections) {
      const element = query('#' + section.id);
      expect(element.getAttribute('aria-labelledby')).toBe(section.id + '-title');
      expect(element.querySelector('h2')!.textContent).toBe(section.title);
      for (const paragraph of section.intro) expect(element.textContent).toContain(paragraph);
    }
    expect(query('#titulo-7').querySelector('article')).toBeNull();
  });

  it('renders every article number, title and paragraph, including both articles numbered 31', async () => {
    await render();
    expect(root().querySelectorAll('article').length).toBe(articles.length);
    for (const article of articles) {
      const element = query('#' + article.id);
      expect(normalize(element.firstElementChild!.textContent)).toBe('Artículo ' + article.number);
      expect(element.querySelector('h3')!.textContent).toBe(article.title);
      expect(element.getAttribute('aria-labelledby')).toBe(article.id + '-title');
      for (const paragraph of article.paragraphs) expect(element.textContent).toContain(paragraph);
    }
    expect(query('#articulo-31 h3').textContent).toBe('Comisarios.');
    expect(query('#articulo-31-bis h3').textContent).toBe('La FIA');
    expect(query('#articulo-33 h3').textContent).toBe('como 33?');
    expect(query('#articulo-33 p').textContent).toBe('Repíteme ese numerin');
  });

  it('renders the marks, leads and text of both lists with severity only on borders', async () => {
    await render();
    for (const number of ['23', '32']) {
      const article = articles.find(article => article.number === number)!;
      const rows = query('#' + article.id).querySelectorAll('ol li');
      expect(rows.length).toBe(article.items!.length);
      article.items!.forEach((item, index) => {
        expect(rows[index].firstElementChild!.textContent).toBe(item.mark);
        expect(rows[index].querySelector('strong')!.textContent).toBe(item.lead + ':');
        expect(normalize(rows[index].querySelector('p')!.textContent)).toBe(item.lead + ': ' + item.text);
      });
    }
    const rows = query('#articulo-32').querySelectorAll('ol li');
    ['border-sector-flat', 'border-warn', 'border-sector-down'].forEach((token, index) => {
      expect(rows[index].classList).toContain('border-l-4');
      expect(rows[index].classList).toContain(token);
      expect(rows[index].className).not.toContain('text-sector');
    });
  });

  it('renders the final provision and the president signature', async () => {
    await render();
    const final = query('#disposicion-final');
    expect(final.querySelector('h2')!.textContent).toBe(STATUTE.finalProvision.title);
    for (const paragraph of STATUTE.finalProvision.paragraphs) expect(final.textContent).toContain(paragraph);
    expect(normalize(final.querySelector('div > p:last-child')!.textContent)).toBe('El PRESIDENTE: BOLLO');
  });

  for (const reduced of [false, true]) {
    it('navigates, focuses, updates the index and closes mobile details with reduced motion ' + reduced, async () => {
      spyOn(window, 'matchMedia').and.returnValue({ matches: reduced } as MediaQueryList);
      await render();
      const details = query<HTMLDetailsElement>('details');
      details.open = true;
      const target = query('#titulo-3');
      const focus = spyOn(target.querySelector('h2')!, 'focus').and.callThrough();
      query<HTMLAnchorElement>('details a[href="#titulo-3"]').click();
      await fixture.whenStable();
      expect(scroll).toHaveBeenCalledWith({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      expect(scroll.calls.mostRecent().object).toBe(target);
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      expect(document.activeElement).toBe(target.querySelector('h2'));
      expect(navigate).toHaveBeenCalledOnceWith([], { fragment: 'titulo-3', replaceUrl: true, scroll: 'manual' });
      expect(component.activeSection()).toBe('titulo-3');
      expect(details.open).toBeFalse();
      for (const nav of Array.from(root().querySelectorAll('nav'))) {
        expect(nav.querySelectorAll('[aria-current="location"]').length).toBe(1);
        expect(nav.querySelector('[aria-current="location"]')!.getAttribute('href')).toBe('#titulo-3');
      }
    });
  }

  it('keeps modified index clicks available to normal browser navigation', async () => {
    await render();
    const event = new MouseEvent('click', { ctrlKey: true, cancelable: true });
    component.navigateToSection(event, 'titulo-3');
    expect(event.defaultPrevented).toBeFalse();
    expect(scroll).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('observes the section boundary, follows scroll in both directions and disconnects', async () => {
    await render();
    expect(observer.observe).toHaveBeenCalledTimes(sectionIds.length);
    const offset = parseFloat(observerOptions!.rootMargin!.split(' ')[0]) * -1;
    const blocks = Array.from(root().querySelectorAll<HTMLElement>('section'));
    const bounds = blocks.map((block, index) => spyOn(block, 'getBoundingClientRect')
      .and.returnValue({ top: index <= 4 ? offset - 10 : offset + 100 } as DOMRect));
    notify([{ isIntersecting: true, target: blocks[4], time: 0, rootBounds: null, boundingClientRect: blocks[4].getBoundingClientRect(), intersectionRect: new DOMRect(), intersectionRatio: 1 }], observer);
    await fixture.whenStable();
    expect(component.activeSection()).toBe('titulo-3');
    expect(query('.statute-index [aria-current="location"]').getAttribute('href')).toBe('#titulo-3');
    bounds.forEach((bound, index) => bound.and.returnValue({ top: index === 0 ? offset - 10 : offset + 100 } as DOMRect));
    notify([{ isIntersecting: true, target: blocks[0], time: 0, rootBounds: null, boundingClientRect: blocks[0].getBoundingClientRect(), intersectionRect: new DOMRect(), intersectionRatio: 1 }], observer);
    await fixture.whenStable();
    expect(component.activeSection()).toBe('preambulo');
    expect(query('.statute-index [aria-current="location"]').getAttribute('href')).toBe('#preambulo');
    fixture.destroy();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('keeps the first entry active when IntersectionObserver is unavailable', async () => {
    Object.defineProperty(window, 'IntersectionObserver', { value: undefined, configurable: true, writable: true });
    await render();
    expect(component.activeSection()).toBe('preambulo');
    expect(query('.statute-index [aria-current="location"]').getAttribute('href')).toBe('#preambulo');
  });

  for (const fragment of ['titulo-3', 'articulo-31-bis', 'articulo-4', 'disposicion-final']) {
    it('scrolls to the initial fragment #' + fragment + ' after rendering', async () => {
      await render(fragment);
      expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
      expect(scroll.calls.mostRecent().object).toBe(query('#' + fragment));
      expect(component.activeSection()).toBe(query('#' + fragment).closest('section')!.id);
      expect(navigate).not.toHaveBeenCalled();
    });
  }

  it('reapplies an initial anchor after the router restores the viewport and preserves manual and history scrolling', async () => {
    await render('articulo-4');
    scroll.calls.reset();
    const events = TestBed.inject(Router).events as Subject<RouterEvent>;
    const navigation = new NavigationEnd(1, '/statute#articulo-4', '/statute#articulo-4');
    const restore = spyOn(window, 'scrollTo');
    restore(0, 0);
    events.next(new Scroll(navigation, null, 'articulo-4'));
    await fixture.whenStable();
    expect(scroll).toHaveBeenCalledOnceWith({ behavior: 'auto', block: 'start' });
    expect(scroll.calls.mostRecent().object).toBe(query('#articulo-4'));
    scroll.calls.reset();
    events.next(new Scroll(navigation, null, 'articulo-4', 'manual'));
    events.next(new Scroll(navigation, [0, 500], 'articulo-4'));
    await fixture.whenStable();
    expect(scroll).not.toHaveBeenCalled();
    fixture.destroy();
    events.next(new Scroll(navigation, null, 'articulo-4'));
    expect(scroll).not.toHaveBeenCalled();
  });

  it('ignores a fragment outside the document', async () => {
    await render('missing-section');
    expect(scroll).not.toHaveBeenCalled();
    expect(component.activeSection()).toBe('preambulo');
  });

  it('LAYOUT fits 320/390/768/1024/1296px in both themes with real header, mobile targets, sticky index and fallback fonts', async () => {
    await render();
    const header = TestBed.createComponent(HeaderComponent);
    header.detectChanges();
    await header.whenStable();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');

    function luminance(color: string): number {
      const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const channel = color.startsWith('color(srgb') ? value : value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }

    try {
      for (const dark of [false, true]) {
        for (const width of [320, 390, 768, 1024, 1296]) {
          for (const forceVerdana of [false, true]) {
            const frame = document.createElement('iframe');
            Object.assign(frame.style, { width: width + 'px', height: '900px', border: '0' });
            document.body.append(frame);
            try {
              const doc = frame.contentDocument!;
              const page = root().cloneNode(true) as HTMLElement;
              page.classList.add('statute-layout');
              doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>'
                + header.nativeElement.outerHTML + page.outerHTML + '</body>';
              doc.documentElement.classList.toggle('dark', dark);
              const override = doc.createElement('style');
              override.id = 'layout-font-override';
              override.textContent = '.statute-layout, .statute-layout * { font-family: Verdana, sans-serif !important; }';
              if (forceVerdana) doc.head.append(override);
              const view = frame.contentWindow!;
              await doc.fonts.ready;
              const context = (dark ? 'dark/' : 'light/') + width + (forceVerdana ? '/Verdana' : '/default');
              const details = doc.querySelector('details')!;
              details.open = true;
              expect(doc.documentElement.scrollWidth).withContext(context + '/page overflow')
                .toBeLessThanOrEqual(doc.documentElement.clientWidth + 1);
              const desktop = doc.querySelector<HTMLElement>('.statute-index')!;
              const mobile = doc.querySelector<HTMLElement>('details')!;
              expect(view.getComputedStyle(desktop).display).toBe(width < 1024 ? 'none' : 'block');
              expect(view.getComputedStyle(mobile).display).toBe(width < 1024 ? 'block' : 'none');
              for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.statute-document, section, article, nav a, h1, h2, h3, li p'))) {
                if (!element.getBoundingClientRect().height) continue;
                expect(element.scrollWidth).withContext(context + '/' + element.tagName + '/overflow')
                  .toBeLessThanOrEqual(element.clientWidth + 1);
              }
              const actualHeaderHeight = doc.querySelector('header')!.getBoundingClientRect().height;
              const section = doc.querySelector<HTMLElement>('section')!;
              expect(parseFloat(view.getComputedStyle(section).scrollMarginTop)).withContext(context + '/header offset')
                .toBe(actualHeaderHeight + 16);
              const subtitle = doc.querySelector<HTMLElement>('.pit-subtitle')!;
              const background = view.getComputedStyle(subtitle.closest('header')!).backgroundColor;
              const values = [luminance(view.getComputedStyle(subtitle).color), luminance(background)].sort((a, b) => b - a);
              expect((values[0] + 0.05) / (values[1] + 0.05)).withContext(context + '/subtitle contrast').toBeGreaterThanOrEqual(4.5);
              if (forceVerdana) expect(view.getComputedStyle(subtitle).fontFamily).toContain('Verdana');
              if (width < 1024) {
                for (const target of Array.from(doc.querySelectorAll<HTMLElement>('details a, summary, a[download]'))) {
                  expect(target.getBoundingClientRect().height).withContext(context + '/touch target').toBeGreaterThanOrEqual(44);
                  target.focus();
                  expect(view.getComputedStyle(target).outlineStyle).withContext(context + '/focus').toBe('solid');
                }
              } else {
                const documentPanel = doc.querySelector<HTMLElement>('.statute-document')!;
                expect(desktop.getBoundingClientRect().right).withContext(context + '/index separation')
                  .toBeLessThan(documentPanel.getBoundingClientRect().left);
                expect(view.getComputedStyle(desktop).position).toBe('sticky');
                expect(view.getComputedStyle(desktop).overflowY).toBe('auto');
                view.scrollTo(0, section.offsetTop + 500);
                expect(desktop.getBoundingClientRect().top).withContext(context + '/sticky header clearance')
                  .toBeGreaterThanOrEqual(actualHeaderHeight + 15);
                expect(desktop.getBoundingClientRect().bottom).withContext(context + '/index fits viewport')
                  .toBeLessThanOrEqual(view.innerHeight);
              }
            } finally {
              frame.contentDocument?.getElementById('layout-font-override')?.remove();
              expect(frame.contentDocument?.getElementById('layout-font-override')).toBeNull();
              frame.remove();
            }
          }
        }
      }
    } finally {
      header.destroy();
    }
  }, 30000);
});
