import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, Params, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { RaceApiService } from '../../../shared/services/api/race-api.service';
import { SeasonApiService } from '../../../shared/services/api/season-api.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { Race } from '../../../shared/models/race';
import { Season } from '../../../shared/models/season';
import { environment } from '../../../enviroments/enviroment';
import { RacesComponent } from './races.component';

describe('RacesComponent', () => {
  let fixture: ComponentFixture<RacesComponent>;
  let api: jasmine.Spy;
  let navigate: jasmine.Spy;
  const historical = new Season(1, 'Temporada 1', 1);
  const current = environment.seasonActual;

  function race(id: number, name: string, day: number, finished = 0): Race {
    return new Race(id, name, 'flag.png', 'circuit.png', new Date(2026, 0, day), historical, finished);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RacesComponent], providers: provideComponentTesting() });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(TestBed.inject(SeasonApiService), 'getSeasons').and.returnValue(of([historical, current]));
    api = spyOn(TestBed.inject(RaceApiService), 'getAllRaces').and.returnValue(of([]));
    spyOn(TestBed.inject(UtilsService), 'handleError');
    fixture = TestBed.createComponent(RacesComponent);
  });

  afterEach(() => fixture.destroy());

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function startAt(params: Params): void {
    fixture.destroy();
    Object.assign(TestBed.inject(ActivatedRoute).snapshot, { queryParamMap: convertToParamMap(params), queryParams: params });
    fixture = TestBed.createComponent(RacesComponent);
  }

  function select(): SelectSeasonsComponent {
    return fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance;
  }

  function rows(): HTMLAnchorElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.calendar-row'));
  }

  it('should create', async () => {
    await render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the API wall-clock calendar day for summer, winter and shortly after midnight', async () => {
    const starts = ['2025-10-05T00:30:00', '2025-01-05T00:30:00', '2025-03-09T02:30:00'];
    api.and.returnValue(of(starts.map((start, index) => ({
      ...race(index + 1, `GP ${index + 1}`, 1, 1), dateStart: start,
    })) as unknown as Race[]));
    await render();
    const times: HTMLTimeElement[] = Array.from(fixture.nativeElement.querySelectorAll('time'));
    expect(times.map(time => time.textContent)).toEqual(['05/10/2025', '05/01/2025', '09/03/2025']);
    expect(times.map(time => time.getAttribute('datetime'))).toEqual(['2025-10-05', '2025-01-05', '2025-03-09']);
  });

  it('features the earliest unfinished race with its date and accessible results link', async () => {
    api.and.returnValue(of([
      race(3, 'Más tarde', 25), race(1, 'Terminada', 1, 1), race(2, 'Gran Premio', 10)
    ]));
    await render();
    const hero: HTMLElement = fixture.nativeElement.querySelector('.race-hero');
    expect(hero.querySelector('h2')!.textContent).toBe('Gran Premio');
    expect(hero.textContent).toContain('Próxima');
    expect(hero.textContent).not.toContain('Completada');
    expect(hero.querySelector('time')!.textContent).toBe('10/01/2026');
    expect(hero.querySelector('time')!.getAttribute('datetime')).toBe('2026-01-10');
    const link = hero.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/results/Gran_Premio/1');
    expect(link.getAttribute('aria-label')).toBe('Ver resultados de Gran Premio');
    const image = hero.querySelector('img')!;
    expect(image.alt).toBe('');
    expect(image.loading).toBe('eager');
    expect(image.hasAttribute('width') && image.hasAttribute('height')).toBeTrue();
  });

  it('features the last completed race by date in a closed season', async () => {
    api.and.returnValue(of([race(3, 'Última', 28, 1), race(1, 'Primera', 1, 1), race(2, 'Segunda', 14, 1)]));
    await render();
    const hero: HTMLElement = fixture.nativeElement.querySelector('.race-hero');
    expect(hero.querySelector('h2')!.textContent).toBe('Última');
    expect(hero.textContent).toContain('Completada');
    expect(hero.querySelector('.pi-check')).not.toBeNull();
    expect(hero.textContent).not.toContain('Próxima');
    expect(hero.querySelector('a')!.getAttribute('href')).toBe('/results/%C3%9Altima/1');
    expect(rows().map(row => row.querySelector('.race-name')!.textContent)).toEqual(['Primera', 'Segunda']);
  });

  it('renders each race once, keeps calendar dates sorted and does not mutate the API array', async () => {
    const races = [race(4, 'Futura', 28), race(2, 'Destacada', 10), race(3, 'Intermedia', 15, 1), race(1, 'Pasada', 1, 1)];
    api.and.returnValue(of(races));
    await render();
    expect(rows().map(row => row.querySelector('.race-name')!.textContent)).toEqual(['Pasada', 'Intermedia', 'Futura']);
    expect(rows().map(row => row.querySelector('time')!.textContent)).toEqual(['01/01/2026', '15/01/2026', '28/01/2026']);
    for (const item of races) {
      const names = Array.from(fixture.nativeElement.querySelectorAll('.hero-title, .race-name'), (element: any) => element.textContent);
      expect(names.filter(name => name === item.name).length).toBe(1);
    }
    expect(races.map(item => item.id)).toEqual([4, 2, 3, 1]);
    expect(fixture.componentInstance['races']()).toBe(races);
  });

  it('links every row and marks only completed races, with dashed borders for pending races', async () => {
    api.and.returnValue(of([race(1, 'Completada uno', 1, 1), race(2, 'Próxima carrera', 2), race(3, 'Pendiente dos', 3)]));
    await render();
    expect(rows().map(row => row.getAttribute('href'))).toEqual(['/results/Completada_uno/1', '/results/Pendiente_dos/1']);
    expect(rows()[0].querySelector('.pi-check')).not.toBeNull();
    expect(rows()[0].classList.contains('border-dashed')).toBeFalse();
    expect(rows()[1].querySelector('.pi-check')).toBeNull();
    expect(rows()[1].textContent).not.toContain('Completada');
    expect(rows()[1].classList.contains('border-dashed')).toBeTrue();
    for (const row of rows()) {
      expect(row.classList.contains('focus-visible:outline-2')).toBeTrue();
      expect(row.querySelector('img')!.alt).toBe('');
    }
  });

  it('renders a single h1, the two h2 headings and season tabs without the carousel', async () => {
    api.and.returnValue(of([race(1, 'Única', 1)]));
    await render();
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Resultados');
    expect(Array.from(fixture.nativeElement.querySelectorAll('h2'), (element: any) => element.textContent)).toEqual(['Única', 'Calendario']);
    expect(rows().length).toBe(0);
    expect(select().variant()).toBe('tabs');
    expect(fixture.nativeElement.querySelector('p-carousel, p-button, p-select')).toBeNull();
  });

  it('shows a hero skeleton and six 64px rows while loading, then the empty status', async () => {
    const request = new Subject<Race[]>();
    api.and.returnValue(request);
    await render();
    expect(fixture.componentInstance['loading']()).toBeTrue();
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBe(7);
    expect(fixture.nativeElement.querySelectorAll('p-skeleton[height="64px"]').length).toBe(6);
    expect(fixture.nativeElement.querySelector('.race-hero, [role="status"], [role="alert"]')).toBeNull();
    request.next([]);
    await render();
    expect(fixture.componentInstance['loading']()).toBeFalse();
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toBe('No hay carreras para esta temporada.');
  });

  it('shows an alert and retries the selected season through the retry button', async () => {
    startAt({ season: '1' });
    api.and.returnValue(throwError(() => new Error('offline')));
    await render();
    const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('No se pudieron cargar las carreras.');
    expect(fixture.nativeElement.querySelector('p-skeleton, .race-hero')).toBeNull();
    const retry = alert.querySelector('button')!;
    expect(retry.type).toBe('button');
    expect(retry.textContent).toBe('Reintentar');
    api.and.returnValue(of([race(1, 'Recuperada', 1)]));
    retry.click();
    await render();
    expect(api.calls.allArgs()).toEqual([[1], [1]]);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.hero-title').textContent).toBe('Recuperada');
  });

  it('loads the current season once even while season options are pending', async () => {
    const seasons = new Subject<Season[]>();
    (TestBed.inject(SeasonApiService).getSeasons as jasmine.Spy).and.returnValue(seasons);
    await render();
    expect(api).toHaveBeenCalledOnceWith(current.number);
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    seasons.next([historical, current]);
    await render();
    expect(api).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reads the initial season once and waits for its validation without showing current races', async () => {
    const seasons = new Subject<Season[]>();
    (TestBed.inject(SeasonApiService).getSeasons as jasmine.Spy).and.returnValue(seasons);
    startAt({ season: '1' });
    await render();
    expect(api).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    seasons.next([historical, current]);
    await render();
    expect(api).toHaveBeenCalledOnceWith(1);
    expect(select().seasonForm.get('season')!.value.number).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
    Object.assign(TestBed.inject(ActivatedRoute).snapshot, { queryParamMap: convertToParamMap({ season: String(current.number) }) });
    await render();
    expect(select().seasonForm.get('season')!.value.number).toBe(1);
    expect(api).toHaveBeenCalledTimes(1);
  });

  for (const value of ['incorrecta', '1extra', '1.5', '0', '-1', '999', '', '9007199254740992']) {
    it('ignores invalid or unavailable season ' + value, async () => {
      startAt({ season: value });
      await render();
      expect(select().seasonForm.get('season')!.value.number).toBe(current.number);
      expect(api).toHaveBeenCalledOnceWith(current.number);
      expect(navigate).not.toHaveBeenCalled();
    });
  }

  it('replaces the season query param on selection, skips repeated selections and omits the current season', async () => {
    await render();
    expect(navigate).not.toHaveBeenCalled();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('select-seasons button'));
    buttons[0].click();
    await render();
    expect(api.calls.allArgs()).toEqual([[current.number], [1]]);
    expect(navigate).toHaveBeenCalledOnceWith([], {
      relativeTo: TestBed.inject(ActivatedRoute), queryParams: { season: 1 }, queryParamsHandling: 'merge', replaceUrl: true
    });
    buttons[0].click();
    await render();
    expect(navigate).toHaveBeenCalledTimes(1);
    buttons[1].click();
    await render();
    expect(navigate.calls.mostRecent().args[1]).toEqual({
      relativeTo: TestBed.inject(ActivatedRoute), queryParams: { season: null }, queryParamsHandling: 'merge', replaceUrl: true
    });
  });

  it('unsubscribes obsolete requests on season changes and destruction', async () => {
    const first = new Subject<Race[]>();
    const second = new Subject<Race[]>();
    api.and.returnValues(first, second);
    await render();
    select().seasonChanged.emit(historical);
    await render();
    expect(first.observed).toBeFalse();
    first.next([race(1, 'Obsoleta', 1)]);
    expect(fixture.componentInstance['races']()).toEqual([]);
    expect(second.observed).toBeTrue();
    fixture.destroy();
    expect(second.observed).toBeFalse();
  });

  it('measures real layout and mobile targets in both themes at 320/390/768/1024/1296px with 24 and zero races', async () => {
    api.and.returnValue(of(Array.from({ length: 24 }, (_, index) => race(
      index + 1, index === 7 ? 'Spa-Francorchamps' : 'Gran Premio de Spa-Francorchamps ' + (index + 1), index + 1, index % 3 === 0 ? 1 : 0
    )).reverse()));
    await render();
    const styles = Array.from(document.styleSheets).flatMap(sheet => {
      try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
      catch { return []; }
    }).join('\n');

    function luminance(color: string): number {
      const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    }

    function contrast(a: string, b: string): number {
      const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (values[0] + 0.05) / (values[1] + 0.05);
    }

    for (const empty of [false, true]) {
      if (empty) {
        api.and.returnValue(of([]));
        fixture.componentInstance['retry']();
        await render();
      }
      for (const dark of [false, true]) {
        for (const width of [320, 390, 768, 1024, 1296]) {
          const frame = document.createElement('iframe');
          frame.style.width = width + 'px';
          frame.style.height = '900px';
          frame.style.border = '0';
          document.body.append(frame);
          try {
            const doc = frame.contentDocument!;
            doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + fixture.nativeElement.outerHTML + '</body>';
            doc.documentElement.classList.toggle('dark', dark);
            const view = frame.contentWindow!;
            const context = (empty ? 'empty' : '24 races') + '/' + (dark ? 'dark' : 'light') + '/' + width;
            expect(doc.documentElement.scrollWidth).withContext(context).toBeLessThanOrEqual(doc.documentElement.clientWidth);
            expect(view.innerWidth).withContext(context).toBe(width);
            const title = doc.querySelector('h1')!.getBoundingClientRect();
            const tabs = doc.querySelector('select-seasons')!.getBoundingClientRect();
            if (width < 768) {
              expect(tabs.top).withContext(context + '/tabs below title').toBeGreaterThanOrEqual(title.bottom);
              for (const target of Array.from(doc.querySelectorAll('a, button'))) {
                expect(target.getBoundingClientRect().height).withContext(context + '/target height').toBeGreaterThanOrEqual(44);
              }
            } else {
              expect(tabs.left).withContext(context + '/tabs right of title').toBeGreaterThanOrEqual(title.right);
            }
            if (empty) {
              expect(doc.querySelector('[role="status"]')).not.toBeNull();
              expect(doc.querySelector('.race-hero, .calendar-row')).toBeNull();
              continue;
            }
            const hero = doc.querySelector<HTMLElement>('.race-hero')!;
            expect(hero.getBoundingClientRect().height).withContext(context + '/hero height').toBeGreaterThanOrEqual(width < 768 ? 340 : 360);
            const heroStyle = view.getComputedStyle(hero);
            expect(contrast(heroStyle.color, heroStyle.backgroundColor)).withContext(context + '/hero contrast').toBeGreaterThanOrEqual(4.5);
            const action = view.getComputedStyle(hero.querySelector('a')!);
            expect(contrast(action.color, action.backgroundColor)).withContext(context + '/action contrast').toBeGreaterThanOrEqual(4.5);
            const calendar = doc.querySelector<HTMLElement>('.calendar-row')!.parentElement!;
            const columns = view.getComputedStyle(calendar).gridTemplateColumns.split(' ').length;
            expect(columns).withContext(context + '/columns').toBe(width < 768 ? 1 : width < 1024 ? 2 : 3);
            expect(doc.querySelectorAll('.calendar-row').length).toBe(23);
            for (const row of Array.from(doc.querySelectorAll<HTMLElement>('.calendar-row'))) {
              const box = row.getBoundingClientRect();
              expect(row.scrollWidth).withContext(context + '/row overflow').toBeLessThanOrEqual(row.clientWidth);
              expect(box.height).withContext(context + '/row height').toBeGreaterThanOrEqual(64);
              const rowStyle = view.getComputedStyle(row);
              for (const text of [row.querySelector('.race-name')!, row.querySelector('time')!]) {
                expect(contrast(view.getComputedStyle(text).color, rowStyle.backgroundColor)).withContext(context + '/row contrast').toBeGreaterThanOrEqual(4.5);
                expect(text.getBoundingClientRect().right).withContext(context + '/text fits').toBeLessThanOrEqual(box.right);
              }
              const chip = row.querySelector('span.bg-pit');
              if (chip) {
                const style = view.getComputedStyle(chip);
                expect(contrast(style.color, style.backgroundColor)).withContext(context + '/chip contrast').toBeGreaterThanOrEqual(4.5);
              }
            }
          } finally {
            frame.remove();
          }
        }
      }
    }
  });
});
