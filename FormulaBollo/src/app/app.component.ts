import { CacheApiService } from './../shared/services/api/cache-api.service';
import { CacheService } from './../shared/services/cache.service';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from "../shared/components/header/header.component";
import { ToastModule } from 'primeng/toast';
import { WebSocketService } from '../shared/services/websocket.service';
import { catchError, Subscription } from 'rxjs';
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
    if (localStorage.getItem("cacheVersion") === null) {
      this.cacheApiService.getCache()
      .pipe(
        catchError((error) => {
          this.cacheService.isVersionRetrieved = false;
          return this.utilsService.handleError<number>(ERROR_CACHE, error, 0);
        })
      )
      .subscribe((cacheVersion: number) => {
          this.cacheService.isVersionRetrieved = true;
          this.cacheService.setCache(cacheVersion);
        }
      );
    }

    this.messageSubscription$ = this.webSocketService.getMessages()
    .pipe(
      catchError((error) => {
        this.cacheService.isVersionRetrieved = false;
        return this.utilsService.handleError<number>(ERROR_CACHE, error, -1);
      })
    )
    .subscribe((actualCacheVersion: number) => {
        if (!this.cacheService.isValidCache(actualCacheVersion)) {
          this.cacheService.setCache(actualCacheVersion);
          this.cacheService.clearCache();
        }
      
        if (actualCacheVersion != -1) {
          this.cacheService.isVersionRetrieved = true;
        }
      }
    )
  }

  ngOnDestroy(): void {
    this.messageSubscription$.unsubscribe();
    this.webSocketService.closeConnection();
  }
}

