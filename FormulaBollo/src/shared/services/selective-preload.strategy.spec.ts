import { of } from 'rxjs';
import { routes } from '../../app/app.routes';
import { SelectivePreloadStrategy } from './selective-preload.strategy';

describe('SelectivePreloadStrategy', () => {
  const strategy = new SelectivePreloadStrategy();

  it('loads routes explicitly marked for preloading', () => {
    const result = of('loaded');
    const load = jasmine.createSpy('load').and.returnValue(result);
    expect(strategy.preload({ data: { preload: true } }, load)).toBe(result);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('skips routes without an explicit true flag', () => {
    const load = jasmine.createSpy('load');
    for (const route of [{}, { data: {} }, { data: { preload: false } }, { data: { preload: 'true' } }]) {
      const next = jasmine.createSpy('next');
      strategy.preload(route, load).subscribe(next);
      expect(next).toHaveBeenCalledWith(null);
    }
    expect(load).not.toHaveBeenCalled();
  });

  it('marks exactly the eight common public routes', () => {
    expect(routes.filter(route => route.data?.['preload'] === true).map(route => route.path).sort()).toEqual([
      'drivers', 'drivers/:name', 'results', 'results/:name/:season', 'statistics', 'statute', 'teams', 'teams/:name'
    ]);
    const privateRoutes = routes.filter(route => route.path?.startsWith('admin') || route.path?.startsWith('fantasy'));
    for (const route of privateRoutes) {
      expect(route.data?.['preload']).toBeUndefined();
      for (const child of route.children ?? []) expect(child.data?.['preload']).toBeUndefined();
    }
  });
});
