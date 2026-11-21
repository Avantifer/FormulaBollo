import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, convertToParamMap, provideRouter, Router, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app/app.routes';
import { nameTitleResolver, PageTitleStrategy, resultsTitleResolver, teamSeasonTitle } from './page-title.strategy';

@Component({ template: '' })
class PageComponent {}

describe('page title resolvers', () => {
  const route = (name: string, season = '3') => ({ paramMap: convertToParamMap({ name, season }) }) as ActivatedRouteSnapshot;

  it('converts driver and team underscores to spaces', () => {
    expect(nameTitleResolver(route('Fernando_Alonso'), {} as RouterStateSnapshot)).toBe('Fernando Alonso');
    expect(nameTitleResolver(route('Aston_Martin'), {} as RouterStateSnapshot)).toBe('Aston Martin');
  });

  it('trims the race and includes its season', () => {
    expect(resultsTitleResolver(route('__Marina_Bay__', '12'), {} as RouterStateSnapshot))
      .toBe('Resultados · Marina Bay · Temporada 12');
  });

  it('formats team titles for a season and Total', () => {
    expect(teamSeasonTitle('McLaren', 3)).toBe('McLaren · Temporada 3 · FormulaBollo');
    expect(teamSeasonTitle('McLaren', 0)).toBe('McLaren · Total · FormulaBollo');
  });
});

describe('PageTitleStrategy', () => {
  let harness: RouterTestingHarness;
  let title: Title;
  let previousTitle: string;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          // Exercise the real route titles and resolvers without page HTTP or guards.
          ...routes.filter(route => route.path !== '').map(route => ({ path: route.path, title: route.title, component: PageComponent })),
          { path: 'untitled', component: PageComponent }
        ].sort((a, b) => a.path === '**' ? 1 : b.path === '**' ? -1 : 0)),
        { provide: TitleStrategy, useClass: PageTitleStrategy }
      ]
    });
    title = TestBed.inject(Title);
    previousTitle = title.getTitle();
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => title.setTitle(previousTitle));

  for (const [url, expected] of [
    ['/home', 'Inicio'], ['/drivers', 'Pilotos'], ['/teams', 'Escuderías'],
    ['/results', 'Resultados'], ['/statute', 'Estatuto'], ['/statistics', 'Estadísticas'],
    ['/admin', 'Administración'], ['/fantasy', 'Fantasy'], ['/fantasy/login', 'Iniciar sesión'],
    ['/fantasy/register', 'Registro'], ['/fantasy/recoverPassword/token', 'Recuperar contraseña'],
    ['/fantasy/clasification', 'Clasificación Fantasy'], ['/fantasy/team', 'Tu equipo'],
    ['/teams/Aston_Martin', 'Aston Martin · Total'],
    ['/results/Marina_Bay__/12', 'Resultados · Marina Bay · Temporada 12'],
    ['/missing', 'Página no encontrada']
  ]) {
    it(`sets the title for ${url}`, async () => {
      await harness.navigateByUrl(url);
      expect(title.getTitle()).toBe(`${expected} · FormulaBollo`);
    });
  }

  it('falls back to the brand when the route has no title', async () => {
    await harness.navigateByUrl('/untitled');
    expect(title.getTitle()).toBe('FormulaBollo');
  });

  it('keeps driver season titles through query navigation and restores the next page title', async () => {
    await harness.navigateByUrl('/drivers/Fernando_Alonso?season=3');
    expect(title.getTitle()).toBe('Fernando Alonso · Temporada 3 · FormulaBollo');
    await TestBed.inject(Router).navigate([], { queryParams: { season: 4 } });
    expect(title.getTitle()).toBe('Fernando Alonso · Temporada 4 · FormulaBollo');
    await harness.navigateByUrl('/drivers/Fernando_Alonso');
    expect(title.getTitle()).toBe('Fernando Alonso · Total · FormulaBollo');
    await harness.navigateByUrl('/teams');
    expect(title.getTitle()).toBe('Escuderías · FormulaBollo');
  });

  it('uses the deepest available title, including an admin parent', async () => {
    TestBed.inject(Router).resetConfig([
      { path: 'admin', title: 'Administración', children: [
        { path: 'results', component: PageComponent },
        { path: 'child', title: 'Detalle', component: PageComponent }
      ] }
    ]);
    await harness.navigateByUrl('/admin/results');
    expect(title.getTitle()).toBe('Administración · FormulaBollo');
    await harness.navigateByUrl('/admin/child');
    expect(title.getTitle()).toBe('Detalle · FormulaBollo');
  });

  it('keeps team season titles through query navigation and restores the list title', async () => {
    await harness.navigateByUrl('/teams/Aston_Martin?season=3');
    expect(title.getTitle()).toBe('Aston Martin · Temporada 3 · FormulaBollo');
    await TestBed.inject(Router).navigate([], { queryParams: { season: 4 } });
    expect(title.getTitle()).toBe('Aston Martin · Temporada 4 · FormulaBollo');
    await harness.navigateByUrl('/teams/Aston_Martin');
    expect(title.getTitle()).toBe('Aston Martin · Total · FormulaBollo');
    await harness.navigateByUrl('/teams');
    expect(title.getTitle()).toBe('Escuderías · FormulaBollo');
  });
});
