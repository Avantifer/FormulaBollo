import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AppComponent } from './app.component';
import { CacheService } from '../shared/services/cache.service';
import { CacheApiService } from '../shared/services/api/cache-api.service';
import { WebSocketService } from '../shared/services/websocket.service';
import { provideComponentTesting } from '../testing/component-test-providers';

describe('Cache version synchronization', () => {
  it('reserves space for routed content before it loads', () => {
    TestBed.configureTestingModule({ providers: provideComponentTesting() });
    const fixture = TestBed.createComponent(AppComponent);
    const main: HTMLElement = fixture.nativeElement.querySelector('main');

    expect(main.classList.contains('min-h-screen')).toBeTrue();
    expect(main.parentElement!.classList.contains('pb-[76px]')).toBeTrue();
    expect(main.parentElement!.classList.contains('md:pb-0')).toBeTrue();
    fixture.destroy();
  });

  it('rechecks existing cache at startup, recovery and visibility, surviving failed checks', () => {
    const connected$ = new Subject<void>();
    const messages$ = new Subject<number>();
    TestBed.configureTestingModule({ providers: [
      ...provideComponentTesting(),
      { provide: WebSocketService, useValue: { connected$, getMessages: () => messages$, closeConnection: () => {} } }
    ] });
    const cache = TestBed.inject(CacheService);
    cache.setCache(1);
    cache.getCache().set('PenaltiesTotalPerRace-12', [1]);
    const api = spyOn(TestBed.inject(CacheApiService), 'getCache').and.returnValue(of(2));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.ngOnInit();
    expect(cache.getCache().size).toBe(0);
    cache.getCache().set('entry', [1]);
    api.and.returnValue(throwError(() => 'offline'));
    connected$.next();
    expect(cache.getCache().size).toBe(1);
    api.and.returnValue(of(3));
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cache.getCache().size).toBe(0);
    cache.getCache().set('entry', [1]);
    messages$.next(4);
    expect(cache.getCache().size).toBe(0);
    fixture.componentInstance.ngOnDestroy();
    const calls = api.calls.count();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(api.calls.count()).toBe(calls);
    localStorage.clear();
  });
});
