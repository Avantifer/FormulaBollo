import { CacheApiService } from './../shared/services/api/cache-api.service';
import { CacheService } from './../shared/services/cache.service';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from "../shared/components/header/header.component";
import { ToastModule } from 'primeng/toast';
import { WebSocketService } from '../shared/services/websocket.service';
import { catchError, EMPTY, filter, fromEvent, merge, of, Subscription, switchMap } from 'rxjs';
import { UtilsService } from '../shared/services/utils.service';
import { ERROR_CACHE } from './constants';
import { FooterComponent } from "../shared/components/footer/footer.component";
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [
    RouterModule,
    ToastModule,
    HeaderComponent,
    FooterComponent
  ]
})
export class AppComponent {
  private readonly webSocketService: WebSocketService = inject(WebSocketService);
  private readonly cacheService: CacheService = inject(CacheService);
  private readonly cacheApiService: CacheApiService = inject(CacheApiService);
  private readonly utilsService: UtilsService = inject(UtilsService);

  private messageSubscription$: Subscription = new Subscription();

  ngOnInit(): void {
    const visible$ = fromEvent(document, 'visibilitychange').pipe(filter(() => document.visibilityState === 'visible'));
    this.messageSubscription$.add(merge(of(undefined), this.webSocketService.connected$, visible$).pipe(
      switchMap(() => this.cacheApiService.getCache().pipe(
        catchError(error => {
          this.utilsService.handleError(ERROR_CACHE, error);
          return EMPTY;
        })
      ))
    ).subscribe(version => this.cacheService.updateVersion(version)));

    this.messageSubscription$.add(this.webSocketService.getMessages().subscribe(version => this.cacheService.updateVersion(version)));
  }

  ngOnDestroy(): void {
    this.messageSubscription$.unsubscribe();
    this.webSocketService.closeConnection();
  }
}

