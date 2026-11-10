import { Injectable, inject } from '@angular/core';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { Observable, tap } from 'rxjs';
import { ChangeDetectionTickService } from './change-detection.service';
import { environment } from '../../enviroments/enviroment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private readonly tick: ChangeDetectionTickService = inject(ChangeDetectionTickService);
  private readonly socket$: WebSocketSubject<any> = webSocket(environment.wsUrl);

  sendMessage(message: any) {
    this.socket$.next(message);
  }

  getMessages(): Observable<any> {
    return this.socket$.asObservable().pipe(tap({ next: () => this.tick.schedule(), error: () => this.tick.schedule() }));
  }

  closeConnection() {
    this.socket$.complete();
  }
}