import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AppComponent } from './app.component';
import { CacheService } from '../shared/services/cache.service';
import { CacheApiService } from '../shared/services/api/cache-api.service';
import { WebSocketService } from '../shared/services/websocket.service';
import { provideComponentTesting } from '../testing/component-test-providers';
import { HttpTestingController } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { UtilsService } from '../shared/services/utils.service';

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
    cache.updateVersion(1);
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

describe('Cache version failure regression', () => {
  let fixture: ComponentFixture<AppComponent>;
  let seed: CacheService;
  let cache: CacheService;
  let http: HttpTestingController;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({ providers: [
      ...provideComponentTesting(),
      { provide: WebSocketService, useValue: {
        connected$: new Subject<void>(), getMessages: () => new Subject<number>(), closeConnection: () => {}
      } }
    ] });
    seed = new CacheService();
    seed.updateVersion(29);
    seed.getOrLoad('pending', () => of('pending cached value')).subscribe();
    seed.getOrLoad('later', () => of('later cached value')).subscribe();
    jasmine.clock().tick(300);
    cache = TestBed.inject(CacheService);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AppComponent);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    cache.clearCache();
    seed.clearCache();
    localStorage.clear();
    jasmine.clock().uninstall();
  });

  it('D: releases pending and later hits immediately on a failed version check without an error toast or handleError', () => {
    const handleError = spyOn(TestBed.inject(UtilsService), 'handleError').and.callThrough();
    const toast = spyOn(TestBed.inject(MessageService), 'add').and.callThrough();
    fixture.detectChanges();
    const request = jasmine.createSpy('request').and.returnValue(of('unexpected fresh value'));
    let phase = 'checking';
    const received: Array<{ value: string; phase: string }> = [];
    cache.getOrLoad<string>('pending', request).subscribe(value => received.push({ value, phase }));
    jasmine.clock().tick(100);
    expect(received).toEqual([]);

    phase = 'failed';
    http.expectOne(r => r.url.endsWith('/cache/current')).flush('offline', { status: 503, statusText: 'Unavailable' });

    expect(received).toEqual([{ value: 'pending cached value', phase: 'failed' }]);
    const later = jasmine.createSpy('later');
    cache.getOrLoad('later', request).subscribe(later);
    expect(later).toHaveBeenCalledOnceWith('later cached value');
    expect(request).not.toHaveBeenCalled();
    expect(handleError).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
  });
});
