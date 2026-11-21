import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { By, Title } from '@angular/platform-browser';
import { BehaviorSubject, EMPTY, of, Subject, throwError } from 'rxjs';
import { provideComponentTesting, teamPointsFixture } from '../../../../testing/component-test-providers';
import { SelectSeasonsComponent } from '../../../../shared/components/select-seasons/select-seasons.component';
import { Season } from '../../../../shared/models/season';
import { TeamInfo } from '../../../../shared/models/teamInfo';
import { TeamWithDrivers } from '../../../../shared/models/teamWithDrivers';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { TeamApiService } from '../../../../shared/services/api/team-api.service';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { SeasonApiService } from '../../../../shared/services/api/season-api.service';
import { CacheService } from '../../../../shared/services/cache.service';
import { ImageService } from '../../../../shared/services/image.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import { TeamsInfoComponent } from './teams-info.component';

describe('TeamsInfoComponent', () => {
  const total = new Season(0, 'Total', 0);
  const season1 = new Season(42, 'Primera', 1);
  const season2 = new Season(43, 'Segunda', 2);
  const team = { ...teamPointsFixture.team, name: 'McLaren' };
  const drivers: DriverPoints[] = [
    { ...teamPointsFixture.driver1, driver: { ...teamPointsFixture.driver1.driver, name: 'Smoking Weed', team }, totalPoints: 336 },
    { ...teamPointsFixture.driver2, driver: { ...teamPointsFixture.driver2.driver, name: 'PepePerez', team }, totalPoints: 78 }
  ];
  const info: TeamInfo = {
    team, totalPoints: 414, victories: 6, podiums: 15, poles: 9, fastlaps: 4,
    averagePosition: 4.5, racesFinished: 30, penalties: 1, bestPosition: 1, constructors: 0,
    last5Results: [4, 1, 1, 2, 2].map((position, index) => {
      const race = {
        id: index + 1, name: index ? 'Carrera de prueba ' + index : 'Marina Bay',
        flagImage: 'flag.png', circuitImage: 'circuit.png',
        dateStart: new Date('2026-01-01T12:00:00Z'), season: season1, finished: 1
      };
      return {
        id: index + 1, race, totalPoints: 99, hasPole: index % 2 === 0, hasFastLap: index % 2 === 1,
        results: drivers.map((point, driverIndex) => ({
          race, driver: point.driver,
          position: { id: driverIndex + 1, positionNumber: position + (driverIndex ? 0 : 2), points: driverIndex ? 12 : 8 },
          pole: 0, fastlap: 0
        }))
      };
    }) as TeamInfo['last5Results']
  };
  let fixture: ComponentFixture<TeamsInfoComponent>;
  let component: TeamsInfoComponent;
  let infoRequest: jasmine.Spy;
  let driversRequest: jasmine.Spy;
  let pointsRequest: jasmine.Spy;
  let standingsRequest: jasmine.Spy;
  let seasonsRequest: jasmine.Spy;
  let navigate: jasmine.Spy;
  let route: ActivatedRoute;
  let params: BehaviorSubject<{ name: string }>;
  let previousTitle: string;

  function standing(id: number, name: string, totalPoints: number): TeamWithDrivers {
    return { ...teamPointsFixture, team: { ...team, id, name }, totalPoints };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TeamsInfoComponent], providers: provideComponentTesting() });
    route = TestBed.inject(ActivatedRoute);
    params = new BehaviorSubject({ name: 'McLaren' });
    Object.assign(route, { params });
    Object.assign(route.snapshot, { paramMap: convertToParamMap({ name: 'McLaren' }), queryParamMap: convertToParamMap({}) });
    infoRequest = spyOn(TestBed.inject(TeamApiService), 'getInfoTeamByName').and.returnValue(of(info));
    driversRequest = spyOn(TestBed.inject(DriverApiService), 'getDriversByTeamName').and.returnValue(of(drivers.map(point => point.driver)));
    pointsRequest = spyOn(TestBed.inject(ResultApiService), 'getSpecificDriversPoints').and.returnValue(of(drivers));
    standingsRequest = spyOn(TestBed.inject(TeamApiService), 'getllTeamsWithDrivers').and.returnValue(of([standing(team.id, team.name, 414)]));
    seasonsRequest = spyOn(TestBed.inject(SeasonApiService), 'getSeasonByTeamName').and.returnValue(EMPTY);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    TestBed.inject(ImageService).getImageUrl = () =>
      'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="gray"/></svg>');
    previousTitle = TestBed.inject(Title).getTitle();
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.inject(Title).setTitle(previousTitle);
  });

  function create(): void {
    fixture = TestBed.createComponent(TeamsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function select(season = season1): void {
    component['onSeasonChange'](season);
    fixture.detectChanges();
  }

  function render(value = info, roster = drivers): void {
    component['teamInfo'].set(value);
    component['_mapTeamStats'](value);
    component['drivers'].set(roster);
    fixture.detectChanges();
  }

  it('reserves the profile space with a single loading h1', () => {
    create();
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    expect(fixture.nativeElement.querySelector('h1').classList.contains('sr-only')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.loading-profile')).not.toBeNull();
  });

  it('renders the team colors, one h1, light badge and decorative car with explicit dimensions', () => {
    create();
    select();
    const hero: HTMLElement = fixture.nativeElement.querySelector('header');
    expect(hero.classList.contains('bg-McLaren')).toBeTrue();
    expect(hero.classList.contains('on-McLaren')).toBeTrue();
    expect(hero.querySelectorAll('h1').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    expect(hero.querySelector('h1')!.textContent).toBe('McLaren');
    const car = hero.querySelector<HTMLImageElement>('.hero-car')!;
    expect(car.alt).toBe('');
    expect(car.getAttribute('width')).toBe('460');
    expect(car.getAttribute('height')).toBe('210');
    expect(car.src).toBe(TestBed.inject(ImageService).getImageUrl(info.team.carImage));
    expect(hero.querySelector('.hero-art')!.getAttribute('aria-hidden')).toBe('true');
    expect(hero.querySelector('.hero-number')!.textContent).toBe('01');
    expect(hero.querySelector<HTMLImageElement>('.team-badge')!.alt).toBe('');
    expect(fixture.nativeElement.querySelector('p-table, p-button')).toBeNull();
  });

  it('links driver rows with names, numbers and points in descending points order', () => {
    create();
    render(info, [...drivers].reverse());
    const chips = fixture.nativeElement.querySelectorAll('a.driver-row') as NodeListOf<HTMLAnchorElement>;
    expect(chips.length).toBe(2);
    chips.forEach((chip, index) => {
      expect(chip.getAttribute('href')).toBe('/drivers/' + drivers[index].driver.name.replaceAll(' ', '_'));
      expect(chip.textContent).toContain(drivers[index].driver.name);
      const number = chip.querySelector<HTMLElement>('.driver-number')!;
      expect(number.textContent).toBe('Número #' + drivers[index].driver.number);
      expect(number.querySelector('.sr-only')!.textContent).toBe('Número ');
      expect(number.querySelector('[aria-hidden="true"]')!.textContent).toBe('#');
      expect(number.parentElement).toBe(chip.querySelector('.driver-label')!.parentElement);
      const points = chip.querySelector('.driver-points')!;
      expect(points.textContent).toBe(drivers[index].totalPoints + ' pts puntos');
      expect(points.querySelector('.driver-number')).toBeNull();
      expect(chip.querySelector('img')!.alt).toBe('');
    });
  });

  it('shares competition ranks excluding vacancies and scales bars relative to the leader', () => {
    create();
    const roster = [50, 100, 200, 100, 0].map((totalPoints, index) => ({
      ...drivers[0], totalPoints, driver: { ...drivers[0].driver, id: index, name: index === 2 ? 'Vacante' : 'Piloto ' + index }
    }));
    render(info, roster);
    const list: HTMLOListElement = fixture.nativeElement.querySelector('.hero-drivers');
    expect(list.tagName).toBe('OL');
    expect(list.querySelectorAll(':scope > li').length).toBe(5);
    expect(Array.from(list.querySelectorAll('.driver-rank'), rank => rank.textContent!.trim())).toEqual(['–', 'Posición 1', 'Posición 1', 'Posición 3', 'Posición 4']);
    expect(list.querySelector('.driver-rank > span')!.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(list.querySelectorAll<HTMLElement>('.driver-fill'), bar => bar.style.width)).toEqual(['100%', '50%', '50%', '25%', '0%']);
    for (const bar of Array.from(list.querySelectorAll('.driver-track'))) expect(bar.getAttribute('aria-hidden')).toBe('true');
    render(info, roster.map(point => ({ ...point, totalPoints: 0 })));
    for (const bar of Array.from(list.querySelectorAll<HTMLElement>('.driver-fill'))) {
      expect(bar.style.width).toBe('0%');
      expect(bar.getAttribute('style')).not.toContain('NaN');
    }
    render(info, []);
    expect(list.children.length).toBe(0);
  });

  it('underlines only the driver name on row hover and keyboard focus', () => {
    create();
    render(info, [{ ...drivers[0], totalPoints: 539, driver: { ...drivers[0].driver, number: 46 } }]);
    const chip = fixture.nativeElement.querySelector('a.driver-row') as HTMLAnchorElement;
    const name = chip.querySelector<HTMLElement>('.driver-label')!;
    const number = chip.querySelector<HTMLElement>('.driver-number')!;
    expect(number.textContent).toBe('Número #46');
    expect(chip.querySelector('.driver-points')!.textContent).toBe('539 pts puntos');
    // DOM mouse events cannot activate :hover. Replay the compiled hover selectors
    // with a class, retaining their declarations and targets to catch propagation.
    const style = document.createElement('style');
    function hoverRules(rules: CSSRuleList): string[] {
      return Array.from(rules).flatMap(rule => {
        if (rule instanceof CSSStyleRule && rule.selectorText.includes('.driver-row') && rule.selectorText.includes(':hover')) {
          return rule.selectorText.split(',').filter(selector => selector.includes(':hover'))
            .map(selector => selector.replaceAll(':hover', '.test-hover') + '{' + rule.style.cssText + '}');
        }
        return rule instanceof CSSGroupingRule ? hoverRules(rule.cssRules) : [];
      });
    }
    style.textContent = Array.from(document.styleSheets).flatMap(sheet => hoverRules(sheet.cssRules)).join('\n');
    expect(style.textContent).not.toBe('');
    document.head.append(style);
    function expectNameOnly(): void {
      expect(getComputedStyle(name).textDecorationLine).toBe('underline');
      expect(getComputedStyle(name).textUnderlineOffset).toBe('3px');
      for (const element of [chip, number, number.parentElement!, chip.querySelector('.driver-points')!]) {
        expect(getComputedStyle(element).textDecorationLine).toBe('none');
      }
    }
    try {
      expect(getComputedStyle(name).textDecorationLine).toBe('none');
      chip.classList.add('test-hover');
      expectNameOnly();
      chip.classList.remove('test-hover');
      chip.focus();
      expect(chip.matches(':focus-visible')).toBeTrue();
      expectNameOnly();
      expect(getComputedStyle(chip).outlineStyle).toBe('solid');
    } finally {
      chip.blur();
      style.remove();
    }
  });

  it('renders case insensitive vacancies without photos, number or link and initials for missing/default photos', () => {
    create();
    const roster = ['vAcAnTe', 'Vacante3', 'Dani Calde', 'Fernando'].map((name, index) => ({
      ...drivers[0], driver: { ...drivers[0].driver, name, driverImage: index === 2 ? '' : 'drivers/default/default.webp' }
    }));
    render(info, roster);
    const chips = fixture.nativeElement.querySelectorAll('.driver-row') as NodeListOf<HTMLElement>;
    expect(chips.length).toBe(4);
    for (const chip of Array.from(chips).slice(0, 2)) {
      expect(chip.tagName).toBe('DIV');
      expect(chip.textContent).toContain('Vacante');
      expect(chip.querySelector('img, a, .driver-number')).toBeNull();
      expect(chip.querySelector('.vacant-avatar')).not.toBeNull();
    }
    expect(chips[2].querySelector('.initials')!.textContent).toBe('DC');
    expect(chips[3].querySelector('.initials')!.textContent).toBe('FE');
    expect(chips[2].querySelector('img')).toBeNull();
    expect(chips[3].querySelector('img')).toBeNull();
  });

  it('shows every historical driver in Total and omits classification and giant rank', () => {
    create();
    select(total);
    render(info, [...drivers, ...[120, 40, 20].map((totalPoints, index) => ({ ...drivers[0], driver: { ...drivers[0].driver, id: index + 3, name: 'Histórico' }, totalPoints }))]);
    const chips = fixture.nativeElement.querySelectorAll('.driver-row');
    expect(chips.length).toBe(5);
    expect(chips[1].textContent).toContain('Histórico');
    expect(fixture.nativeElement.querySelector('.classification-stat, .hero-number')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.key-stats > .stat').length).toBe(4);
    expect(standingsRequest).not.toHaveBeenCalled();
  });

  for (const position of [1, 2, 3, 5, 10]) {
    it('shows competition position ' + position + ', podium color and championship size', () => {
      create();
      standingsRequest.and.returnValue(of([
        ...Array.from({ length: position - 1 }, (_, i) => standing(i + 10, 'Rival ' + i, 500)),
        standing(team.id, team.name, position === 10 ? 0 : 414)
      ]));
      select();
      const cell = fixture.nativeElement.querySelector('.classification-stat') as HTMLElement;
      const value = cell.querySelector<HTMLElement>('.classification-value')!;
      expect(cell.querySelector('dt')!.textContent).toBe('Clasificación');
      expect(value.textContent).toBe(position + '.º');
      expect(cell.querySelector('.classification-total')!.textContent).toBe('de ' + position);
      expect(cell.querySelector('.sr-only')!.textContent).toBe('Puesto ' + position + ' de ' + position + ' en la clasificación');
      for (const podium of [1, 2, 3]) expect(value.classList.contains('text-podium-' + podium)).toBe(position === podium);
      expect(fixture.nativeElement.querySelector('.hero-number').textContent).toBe(String(position).padStart(2, '0'));
    });
  }

  it('shares competition ranks on ties with a screen reader label only and matches historical names', () => {
    create();
    standingsRequest.and.returnValue(of([standing(8, 'Líder', 500), standing(9, 'Empatado', 414), standing(999, 'McLaren', 414)]));
    select();
    expect(fixture.nativeElement.querySelector('.classification-value').textContent).toBe('2.º');
    expect(fixture.nativeElement.querySelector('.classification-stat .sr-only').textContent).toBe('Puesto 2 de 3 en la clasificación empatado');
    expect(fixture.nativeElement.querySelector('.classification-value').textContent).not.toContain('empatado');
  });

  for (const result of [[], [standing(999, 'Otro', 100)], [standing(team.id, team.name, 0)]]) {
    it('omits classification for unavailable or scoreless standings: ' + JSON.stringify(result.map(point => point.totalPoints)), () => {
      create();
      standingsRequest.and.returnValue(of(result));
      select();
      expect(fixture.nativeElement.querySelector('.classification-stat, .hero-number')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.points-bar').length).toBe(1);
    });
  }

  it('keeps the complete profile when classification fails', () => {
    create();
    standingsRequest.and.returnValue(throwError(() => 'offline'));
    const error = spyOn(TestBed.inject(UtilsService), 'handleError');
    select();
    expect(fixture.nativeElement.querySelector('.classification-stat, .hero-number')).toBeNull();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('McLaren');
    expect(fixture.nativeElement.querySelectorAll('.race-row').length).toBe(5);
    expect(error).not.toHaveBeenCalled();
  });

  it('renders four main and six secondary stats with comma decimals and tabular numbers', () => {
    create();
    render();
    for (const group of [
      { selector: '.key-stats', labels: ['Puntos Totales', 'Victorias', 'Podios', 'Poles'], values: ['414', '6', '15', '9'] },
      { selector: '.secondary-stats', labels: ['Vueltas Rápidas', 'Posición Media', 'Carreras Terminadas', 'Penalizaciones', 'Mejor posición', 'Constructores'], values: ['4', '4,50', '30', '1', '1', '0'] }
    ]) {
      const cells = fixture.nativeElement.querySelectorAll(group.selector + ' > .stat') as NodeListOf<HTMLElement>;
      expect(cells.length).toBe(group.labels.length);
      cells.forEach((cell, index) => {
        expect(cell.querySelector('dt')!.textContent!.trim()).toBe(group.labels[index]);
        expect(cell.querySelector('dd')!.textContent).toBe(group.values[index]);
        expect(cell.querySelector('dd')!.classList.contains('tabular-nums')).toBeTrue();
      });
    }
    expect(fixture.nativeElement.querySelector('.points-bar').classList.contains('bg-McLaren')).toBeTrue();
  });

  it('renders five timeline races with the better position, statuses, summed points, dates and accessible results links', () => {
    create();
    select();
    const best = spyOn(TestBed.inject(UtilsService), 'whichPositionIsBetter').and.callThrough();
    const sum = spyOn(TestBed.inject(UtilsService), 'sumPoints').and.callThrough();
    render();
    const rows = fixture.nativeElement.querySelectorAll('ol > .race-row') as NodeListOf<HTMLElement>;
    expect(rows.length).toBe(5);
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Últimas 5 carreras');
    expect(fixture.nativeElement.textContent).toContain('Solo se muestran carreras principales, no incluye carreras sprint');
    rows.forEach((row, index) => {
      const result = info.last5Results[index];
      expect(row.querySelector('.position')!.textContent!.trim()).toBe('Posición ' + [4, 1, 1, 2, 2][index]);
      expect(row.querySelector('h3')!.textContent).toBe(result.race.name);
      expect(row.querySelector('time')!.textContent).toBe('01/01/2026');
      expect(row.querySelector('time')!.getAttribute('datetime')).toBe('2026-01-01');
      expect(row.querySelector('img')!.getAttribute('alt')).toBe('');
      const marks = row.querySelectorAll('.race-marks > span');
      expect(marks[0].textContent).toBe('Pole ' + (index % 2 ? 'No' : 'Sí'));
      expect(marks[1].textContent).toBe('Vuelta Rápida ' + (index % 2 ? 'Sí' : 'No'));
      expect(marks[0].classList.contains('text-sector-up')).toBe(index % 2 === 0);
      expect(marks[1].classList.contains('text-sector-up')).toBe(index % 2 === 1);
      expect(row.querySelector('.race-points')!.textContent).toBe('Puntos +20');
      const link = row.querySelector<HTMLAnchorElement>('.results-link')!;
      expect(link.getAttribute('href')).toBe('/results/' + result.race.name.replaceAll(' ', '_') + '/1');
      expect(link.getAttribute('aria-label')).toBe('Resultados de ' + result.race.name);
    });
    expect(best).toHaveBeenCalled();
    expect(sum).toHaveBeenCalled();
  });

  it('renders a dash when neither driver finished and handles a single result', () => {
    create();
    const race = info.last5Results[0];
    for (const results of [[], race.results.map(result => ({ ...result, position: null! }))]) {
      render({ ...info, last5Results: [{ ...race, results }] });
      expect(fixture.nativeElement.querySelector('.position').textContent.trim()).toBe('Posición –');
      expect(fixture.nativeElement.querySelector('.race-points').textContent).toBe('Puntos +0');
    }
    render({ ...info, last5Results: [{ ...race, results: [race.results[1]] }] });
    expect(fixture.nativeElement.querySelector('.position').textContent.trim()).toBe('Posición 4');
    expect(fixture.nativeElement.querySelector('.race-points').textContent).toBe('Puntos +12');
  });

  it('renders the empty result message without a timeline', () => {
    create();
    render({ ...info, last5Results: [] });
    expect(fixture.nativeElement.querySelector('.race-timeline')).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-results').textContent).toBe('No hay resultados disponibles');
  });

  async function open(season?: string): Promise<SelectSeasonsComponent> {
    Object.assign(route.snapshot, { queryParamMap: convertToParamMap(season === undefined ? {} : { season }) });
    seasonsRequest.and.returnValue(of([season1, season2]));
    create();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance;
  }

  it('opens season by number once and fetches the team seasons using real tabs', async () => {
    const selector = await open('1');
    expect(selector.variant()).toBe('tabs');
    expect(selector.initialSeasonNumber()).toBe(1);
    expect(selector.seasonForm.get('season')!.value).toEqual(season1);
    expect(selector.seasons()[0]).toEqual(total);
    expect(seasonsRequest).toHaveBeenCalledOnceWith('McLaren');
    expect(infoRequest).toHaveBeenCalledOnceWith('McLaren', 1);
    expect(driversRequest).toHaveBeenCalledOnceWith('McLaren', 1);
    expect(pointsRequest).toHaveBeenCalledOnceWith(1, drivers.map(point => point.driver.id));
    expect(standingsRequest).toHaveBeenCalledOnceWith(1);
    expect(fixture.nativeElement.querySelector('.back-link').getAttribute('href')).toBe('/teams?season=1');
    Object.assign(route.snapshot, { queryParamMap: convertToParamMap({ season: '2' }) });
    params.next({ name: 'McLaren' });
    fixture.detectChanges();
    expect(infoRequest).toHaveBeenCalledTimes(1);
  });

  for (const value of [undefined, '', 'invalid', '-1', '1.5', '1e0', '999', '9007199254740993']) {
    it('falls back to Total for invalid/unknown initial season ' + value, async () => {
      const selector = await open(value);
      expect(selector.seasonForm.get('season')!.value.number).toBe(0);
      expect(infoRequest).toHaveBeenCalledOnceWith('McLaren', 0);
      expect(fixture.nativeElement.querySelector('.back-link').getAttribute('href')).toBe('/teams');
    });
  }

  it('replaces the URL, updates title on tab selection and removes season for Total', async () => {
    await open('1');
    navigate.calls.reset();
    fixture.nativeElement.querySelectorAll('select-seasons button')[2].click();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledOnceWith([], {
      relativeTo: route, queryParams: { season: 2 }, queryParamsHandling: 'merge', replaceUrl: true
    });
    expect(TestBed.inject(Title).getTitle()).toBe('McLaren · Temporada 2 · FormulaBollo');
    navigate.calls.reset();
    fixture.nativeElement.querySelectorAll('select-seasons button')[0].click();
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledOnceWith([], {
      relativeTo: route, queryParams: { season: null }, queryParamsHandling: 'merge', replaceUrl: true
    });
    expect(TestBed.inject(Title).getTitle()).toBe('McLaren · Total · FormulaBollo');
    expect(fixture.nativeElement.querySelector('.classification-stat, .hero-number')).toBeNull();
  });

  it('reinitializes a reused route once without keeping another team data', async () => {
    await open('1');
    infoRequest.and.returnValue(EMPTY);
    driversRequest.and.returnValue(EMPTY);
    infoRequest.calls.reset();
    Object.assign(route.snapshot, { queryParamMap: convertToParamMap({ season: '2' }) });
    params.next({ name: 'Aston_Martin' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(infoRequest).toHaveBeenCalledOnceWith('Aston Martin', 2);
    expect(component['teamInfo']()).toBeUndefined();
    expect(component['drivers']()).toEqual([]);
  });

  it('preloads the existing cache keys for the requested season and preserves the previous profile during refresh', () => {
    Object.assign(route.snapshot, { queryParamMap: convertToParamMap({ season: '2' }) });
    const cache = TestBed.inject(CacheService).loadCache();
    cache.set('infoTeamByName-McLaren-2', info);
    cache.set('driversByTeamName-McLaren-2', drivers.map(point => point.driver));
    cache.set('specificDriverPoints-2-1,2', drivers);
    cache.set('allTeamsWithDrivers-2', [standing(team.id, team.name, 414)]);
    create();
    expect(component['teamInfo']()).toBe(info);
    expect(component['drivers']()).toEqual(drivers);
    expect(component['championshipPosition']()?.position).toBe(1);
    const pendingInfo = new Subject<TeamInfo>();
    const pendingDrivers = new Subject<DriverPoints[]>();
    infoRequest.and.returnValue(pendingInfo);
    pointsRequest.and.returnValue(pendingDrivers);
    select(season1);
    expect(fixture.nativeElement.querySelector('header').classList.contains('bg-McLaren')).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.driver-row').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.loading-profile')).toBeNull();
  });

  it('cancels stale requests during fast tab changes and after destroy', () => {
    create();
    const staleInfo = new Subject<TeamInfo>();
    const staleDrivers = new Subject<DriverPoints[]>();
    const staleStandings = new Subject<TeamWithDrivers[]>();
    infoRequest.and.returnValues(staleInfo, of(info));
    pointsRequest.and.returnValues(staleDrivers, of(drivers));
    standingsRequest.and.returnValues(staleStandings, of([standing(team.id, team.name, 414)]));
    select();
    select(season2);
    staleInfo.next({ ...info, team: { ...team, name: 'Haas' } });
    staleDrivers.next([]);
    staleStandings.next([]);
    fixture.detectChanges();
    expect(component['teamInfo']()?.team.name).toBe('McLaren');
    expect(component['drivers']().length).toBe(2);
    expect(component['championshipPosition']()?.position).toBe(1);
    infoRequest.and.returnValue(staleInfo);
    pointsRequest.and.returnValue(of(drivers));
    standingsRequest.and.returnValue(of([]));
    select();
    fixture.destroy();
    staleInfo.next({ ...info, totalPoints: 999 });
    expect(component['teamInfo']()?.totalPoints).toBe(414);
  });

  it('checks real styles, overflow, touch targets, focus and contrast at every requested size in both themes', async () => {
    create();
    const selector = fixture.debugElement.query(By.directive(SelectSeasonsComponent)).componentInstance as SelectSeasonsComponent;
    selector.seasons.set([total, season1, season2, new Season(44, 'Tercera', 3)]);
    function luminance(color: string): number {
      const c = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
        const n = value / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
      return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    }
    function contrast(a: string, b: string): number {
      const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (values[0] + 0.05) / (values[1] + 0.05);
    }
    const cases = [
      { name: 'Ferrari', position: 1, points: 1405, roster: [539, 478, 292, 72, 24].map((totalPoints, index) => ({
        ...drivers[0], totalPoints, driver: { ...drivers[0].driver, id: index + 1, name: ['Bubapu', 'Robe', 'Fernando', 'Chamann', 'Escapa'][index] }
      })), races: info.last5Results },
      { name: 'McLaren', position: 1, points: 414, roster: drivers, races: info.last5Results },
      { name: 'Mercedes', position: 2, points: 336, roster: [drivers[0]], races: [] },
      { name: 'Williams', position: 3, points: 492, roster: [...drivers, { ...drivers[1], driver: { ...drivers[1].driver, name: 'Un nombre muy largo para comprobar el truncado' } }], races: [] },
      { name: 'Aston Martin', position: 5, points: 222, roster: [
        { ...drivers[0], driver: { ...drivers[0].driver, name: 'Dani Calde', driverImage: 'drivers/default/default.webp' } }, drivers[1]
      ], races: info.last5Results },
      { name: 'RB', position: 10, points: 0, roster: drivers.map((point, index) => ({
        ...point, totalPoints: 0, driver: { ...point.driver, name: index ? 'Vacante3' : 'Vacante' }
      })), races: [] }
    ];
    for (const sample of cases) {
      for (const isTotal of [false, true]) {
        const value = { ...info, team: { ...team, name: sample.name }, totalPoints: sample.points, last5Results: sample.races };
        infoRequest.and.returnValue(of(value));
        standingsRequest.and.returnValue(of([
          ...Array.from({ length: sample.position - 1 }, (_, i) => standing(i + 10, 'Rival ' + i, 500)),
          standing(team.id, sample.name, sample.points)
        ]));
        select(isTotal ? total : season1);
        render(value, sample.roster);
        await fixture.whenStable();
        const styles = Array.from(document.styleSheets).flatMap(sheet => {
          try { return Array.from(sheet.cssRules, rule => rule.cssText).filter(rule => !rule.startsWith('@import')); }
          catch { return []; }
        }).join('\n');
        for (const dark of [false, true]) {
          for (const width of [320, 390, 640, 768, 1024, 1296]) {
            const frame = document.createElement('iframe');
            Object.assign(frame.style, { width: width + 'px', height: '1200px', border: '0' });
            document.body.append(frame);
            try {
              const doc = frame.contentDocument!;
              doc.documentElement.innerHTML = '<head><style>' + styles + '</style></head><body>' + fixture.nativeElement.outerHTML + '</body>';
              doc.documentElement.classList.toggle('dark', dark);
              const view = frame.contentWindow!;
              await doc.fonts.ready;
              const context = sample.name + '/' + (isTotal ? 'Total' : 'season') + '/' + (dark ? 'dark' : 'light') + '/' + width;
              expect(doc.documentElement.scrollWidth).withContext(context + '/document overflow').toBeLessThanOrEqual(doc.documentElement.clientWidth);
              for (const element of Array.from(doc.querySelectorAll<HTMLElement>('.team-name, .driver-row, .driver-identity, .stat, .stat dt, .stat dd, .race-row, .race-circuit, .race-marks, .results-link'))) {
                expect(element.scrollWidth).withContext(context + '/' + element.className).toBeLessThanOrEqual(element.clientWidth);
              }
              const hero = doc.querySelector<HTMLElement>('header')!;
              const heroRect = hero.getBoundingClientRect();
              const badge = doc.querySelector<HTMLElement>('.team-badge')!;
              expect(view.getComputedStyle(badge).backgroundColor).toBe('rgb(233, 236, 239)');
              expect(view.getComputedStyle(badge).filter).toBe('none');
              expect(doc.querySelectorAll('.driver-row').length).toBe(sample.roster.length);
              expect(doc.querySelector('.classification-stat') === null).toBe(isTotal);
              expect(doc.querySelector('.hero-number') === null).toBe(isTotal);
              const car = doc.querySelector<HTMLElement>('.hero-car')!.getBoundingClientRect();
              const heading = doc.querySelector('h1')!.getBoundingClientRect();
              const list = doc.querySelector<HTMLElement>('.hero-drivers')!;
              expect(list.tagName).toBe('OL');
              expect(list.getBoundingClientRect().width).toBeLessThanOrEqual(560);
              expect(list.getBoundingClientRect().top).withContext(context + '/list below heading').toBeGreaterThanOrEqual(heading.bottom);
              for (const row of Array.from(doc.querySelectorAll<HTMLElement>('.driver-row'))) {
                expect(row.getBoundingClientRect().height).withContext(context + '/row height').toBeGreaterThanOrEqual(44);
                expect(row.querySelector('.driver-avatar')!.getBoundingClientRect().width).toBe(32);
                expect(row.querySelector('.driver-track')!.getBoundingClientRect().width).withContext(context + '/bar minimum').toBeGreaterThanOrEqual(48);
                expect(row.querySelector('.driver-track')!.getBoundingClientRect().height).toBe(4);
                const label = row.querySelector<HTMLElement>('.driver-label')!;
                expect(view.getComputedStyle(label).textOverflow).toBe('ellipsis');
                expect(view.getComputedStyle(label).whiteSpace).toBe('nowrap');
                if (width >= 640) expect(row.getBoundingClientRect().right).withContext(context + '/rows clear of car').toBeLessThanOrEqual(car.left);
              }
              expect(car.width).withContext(context + '/car visible').toBeGreaterThan(0);
              if (width < 640) {
                expect(car.top).withContext(context + '/car below name').toBeGreaterThanOrEqual(heading.bottom);
                const chips = doc.querySelector<HTMLElement>('.hero-drivers')!.getBoundingClientRect();
                expect(car.top).withContext(context + '/car below rows').toBeGreaterThanOrEqual(chips.bottom);
              }
              for (const chip of Array.from(doc.querySelectorAll<HTMLElement>('.driver-row'))) {
                expect(chip.getBoundingClientRect().bottom).withContext(context + '/chips inside hero').toBeLessThanOrEqual(heroRect.bottom);
              }
              const bar = doc.querySelector<HTMLElement>('.points-bar')!;
              expect(bar.getBoundingClientRect().width).toBe(3);
              expect(view.getComputedStyle(bar).backgroundColor).toBe(view.getComputedStyle(hero).backgroundColor);
              expect(doc.querySelectorAll('.points-bar').length).toBe(1);
              for (const target of Array.from(doc.querySelectorAll<HTMLElement>('a, button'))) {
                const rect = target.getBoundingClientRect();
                expect(rect.width).withContext(context + '/target width').toBeGreaterThanOrEqual(44);
                expect(rect.height).withContext(context + '/target height').toBeGreaterThanOrEqual(44);
                target.focus();
                expect(view.getComputedStyle(target).outlineStyle).withContext(context + '/focus').toBe('solid');
              }
              const heroBackground = view.getComputedStyle(hero).backgroundColor;
              for (const text of Array.from(doc.querySelectorAll('h1, .driver-label, .driver-number, .driver-rank, .driver-points'))) {
                expect(contrast(view.getComputedStyle(text).color, heroBackground)).withContext(context + '/hero contrast').toBeGreaterThanOrEqual(4.5);
              }
              const heroClasses = hero.className;
              const teams = ['Red_Bull', 'AlphaTauri', 'Ferrari', 'Mercedes', 'Aston_Martin', 'Williams', 'Haas', 'McLaren', 'Alfa_Romeo', 'Alpine', 'Kick_Sauber', 'RB'];
              for (const team of [...teams, 'Alfa_Romeo_Racing']) {
                hero.className = 'team-hero bg-' + team + ' on-' + team;
                for (const text of Array.from(hero.querySelectorAll<HTMLElement>('.driver-label, .driver-rank, .driver-points'))) {
                  expect(contrast(view.getComputedStyle(text).color, view.getComputedStyle(hero).backgroundColor)).withContext(context + '/' + team + '/text contrast').toBeGreaterThanOrEqual(4.5);
                }
                for (const number of Array.from(hero.querySelectorAll<HTMLElement>('.driver-number'))) {
                  const numberStyle = view.getComputedStyle(number);
                  const labelStyle = view.getComputedStyle(number.parentElement!.querySelector('.driver-label')!);
                  expect(contrast(numberStyle.color, view.getComputedStyle(hero).backgroundColor)).withContext(context + '/' + team + '/number contrast').toBeGreaterThanOrEqual(4.5);
                  expect(numberStyle.opacity).toBe('1');
                  expect(Number(numberStyle.fontWeight)).toBeLessThan(Number(labelStyle.fontWeight));
                  expect(parseFloat(numberStyle.fontSize)).toBe(width < 640 ? 12 : 14);
                  expect(numberStyle.marginInlineStart).toBe('8px');
                  expect(numberStyle.whiteSpace).toBe('nowrap');
                }
              }
              hero.className = heroClasses;
              for (const text of Array.from(doc.querySelectorAll('.initials'))) {
                expect(contrast(view.getComputedStyle(text).color, view.getComputedStyle(text).backgroundColor)).toBeGreaterThanOrEqual(4.5);
              }
              for (const text of Array.from(doc.querySelectorAll('.stat dt, .stat dd, .classification-value, .classification-total'))) {
                const panel = text.closest('.secondary-stats') ?? doc.querySelector('.team-stats')!;
                expect(contrast(view.getComputedStyle(text).color, view.getComputedStyle(panel).backgroundColor)).withContext(context + '/stat contrast').toBeGreaterThanOrEqual(4.5);
              }
              const canvas = view.getComputedStyle(doc.querySelector('.bg-canvas')!).backgroundColor;
              for (const text of Array.from(doc.querySelectorAll('.race-marks > span, .race-points, time'))) {
                expect(contrast(view.getComputedStyle(text).color, canvas)).withContext(context + '/race contrast').toBeGreaterThanOrEqual(4.5);
              }
              expect(view.getComputedStyle(doc.querySelector('.key-stats')!).gridTemplateColumns.split(' ').length).toBe(width < 768 ? 2 : isTotal ? 4 : 5);
              console.info('TEAM_INFO_LAYOUT', context, 'scrollWidth=' + doc.documentElement.scrollWidth);
            } finally { frame.remove(); }
          }
        }
      }
    }
  }, 30000);
});
