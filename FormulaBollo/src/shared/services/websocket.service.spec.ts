import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { WebSocketSubjectConfig } from 'rxjs/webSocket';
import { CACHE_SOCKET_FACTORY, WebSocketService } from './websocket.service';

describe('Cache websocket reconnect', () => {
  let sockets: Subject<number>[];
  let configs: WebSocketSubjectConfig<number>[];
  let service: WebSocketService;
  beforeEach(() => {
    jasmine.clock().install();
    sockets = [];
    configs = [];
    TestBed.configureTestingModule({ providers: [{ provide: CACHE_SOCKET_FACTORY, useValue: (config: WebSocketSubjectConfig<number>) => {
      configs.push(config);
      const socket = new Subject<number>();
      sockets.push(socket);
      return socket;
    } }] });
    service = TestBed.inject(WebSocketService);
  });
  afterEach(() => { service.closeConnection(); jasmine.clock().uninstall(); });

  it('backs off exponentially up to thirty seconds and cancels pending retries on destroy', () => {
    service.getMessages().subscribe();
    for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
      const count = sockets.length;
      sockets.at(-1)!.error('offline');
      jasmine.clock().tick(delay - 1);
      expect(sockets.length).toBe(count);
      jasmine.clock().tick(1);
      expect(sockets.length).toBe(count + 1);
    }
    sockets.at(-1)!.error('offline');
    service.closeConnection();
    const count = sockets.length;
    jasmine.clock().tick(30000);
    expect(sockets.length).toBe(count);
  });

  it('reconnects on a normal server close, announces recovery and continues receiving versions', () => {
    const connected = jasmine.createSpy('connected');
    const received = jasmine.createSpy('received');
    service.connected$.subscribe(connected);
    service.getMessages().subscribe(received);
    sockets[0].complete();
    jasmine.clock().tick(1000);
    configs[1].openObserver!.next!(new Event('open'));
    sockets[1].next(12);
    expect(connected).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenCalledWith(12);
  });
});
