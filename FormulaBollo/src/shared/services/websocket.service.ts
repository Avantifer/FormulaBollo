import { inject, Injectable, InjectionToken } from '@angular/core';
import { WebSocketSubject, WebSocketSubjectConfig, webSocket } from 'rxjs/webSocket';
import { defer, Observable, repeat, retry, share, Subject, takeUntil, timer } from 'rxjs';
import { environment } from '../../enviroments/enviroment';

export const CACHE_SOCKET_FACTORY = new InjectionToken<(config: WebSocketSubjectConfig<number>) => WebSocketSubject<number>>(
  'Cache socket factory', { providedIn: 'root', factory: () => config => webSocket<number>(config) }
);

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private readonly createSocket = inject(CACHE_SOCKET_FACTORY);
  private socket$?: WebSocketSubject<number>;
  private readonly stopped$ = new Subject<void>();
  private readonly connectionSubject = new Subject<void>();
  readonly connected$ = this.connectionSubject.asObservable();
  private reconnectAttempt = 0;
  private readonly reconnectDelay = () => timer(Math.min(1000 * 2 ** this.reconnectAttempt++, 30000));

  private readonly messages$ = defer(() => {
    this.socket$ = this.createSocket({
      url: environment.wsUrl,
      openObserver: { next: () => {
        this.reconnectAttempt = 0;
        this.connectionSubject.next();
      } }
    });
    return this.socket$;
  }).pipe(
    retry({ delay: this.reconnectDelay }),
    repeat({ delay: this.reconnectDelay }),
    takeUntil(this.stopped$),
    share()
  );

  sendMessage(message: number): void {
    this.socket$?.next(message);
  }

  getMessages(): Observable<number> {
    return this.messages$;
  }

  closeConnection(): void {
    this.stopped$.next();
    this.socket$?.complete();
  }
}
