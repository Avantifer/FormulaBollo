import { Injectable } from '@angular/core';
import { catchError, defer, EMPTY, finalize, Observable, of, race, shareReplay, startWith, Subject, switchMap, throwError, take, tap, timer } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache: Map<string, any>;
  private version: number | null = null;
  private versionInUse = false;
  private readonly persistedKeys = new Set<string>();
  private readonly screenDataOutdated = new Subject<void>();
  readonly screenDataOutdated$ = this.screenDataOutdated.asObservable();
  private versionCheckSettled = false;
  private readonly versionCheckFinished = new Subject<void>();
  private readonly inFlight = new Map<string, Observable<unknown>>();
  private generation = 0;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  
  constructor() {
    this.cache = this.loadCache();
  }

  loadCache(): Map<string, any> {
    if (this.cache) return this.cache;
    try {
      const storedCache = localStorage.getItem('apiCache');
      if (storedCache !== null) {
        const stored = JSON.parse(storedCache);
        if (!stored || typeof stored.version !== 'number' || !Number.isFinite(stored.version)
          || stored.version < 0 || !Array.isArray(stored.entries)
          || !stored.entries.every((entry: unknown) => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string')) {
          throw new Error('Invalid persisted cache');
        }
        this.cache = new Map(stored.entries);
        this.cache.forEach((_, key) => this.persistedKeys.add(key));
        this.version = stored.version;
      } else {
        this.cache = new Map();
      }
    } catch {
      this.cache = new Map();
      this.removePersistedCache();
    }
    return this.cache;
  }

  getCache(): Map<string, any> {
    return this.cache;
  }

  saveCache(): void {
    if (this.saveTimer !== undefined) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      try {
        const serialized = JSON.stringify({ version: this.version, entries: Array.from(this.cache.entries()) });
        if (serialized.length > 2_000_000) {
          this.removePersistedCache();
          return;
        }
        localStorage.setItem('apiCache', serialized);
      } catch {
        this.removePersistedCache();
      }
    }, 300);
  }

  private removePersistedCache(): void {
    try {
      localStorage.removeItem('apiCache');
    } catch {
      // Storage can be unavailable; the in-memory cache remains usable.
    }
  }

  clearCache(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    this.generation++;
    this.cache.clear();
    this.persistedKeys.clear();
    this.inFlight.clear();
    this.removePersistedCache();
  }

  /** A view owns this subscription; API requests remain finite for forkJoin/lastValueFrom. */
  refreshOnPublish<T>(request: (refresh: boolean) => Observable<T>): Observable<T> {
    return defer(() => {
      let loaded = false;
      return this.screenDataOutdated$.pipe(
        startWith(undefined),
        switchMap(() => defer(() => request(loaded)).pipe(
          tap(() => loaded = true),
          // Until data arrives, preserve first-load error handling even after a publication.
          catchError(error => loaded ? EMPTY : throwError(() => error))
        ))
      );
    });
  }

  getOrLoad<T>(key: string, request: () => Observable<T>): Observable<T> {
    return defer(() => {
      if (this.cache.has(key) && !this.versionCheckSettled) {
        return race(this.versionCheckFinished, timer(3000)).pipe(
          take(1),
          switchMap(() => this.getCachedOrLoad(key, request))
        );
      }
      return this.getCachedOrLoad(key, request);
    });
  }

  private getCachedOrLoad<T>(key: string, request: () => Observable<T>): Observable<T> {
    if (this.cache.has(key)) {
      return of(this.cache.get(key) as T).pipe(tap(() => {
        if (this.persistedKeys.has(key)) this.versionInUse = true;
      }));
    }
    const pending = this.inFlight.get(key);
    if (pending) return pending as Observable<T>;
    const generation = this.generation;
    const shared = defer(request).pipe(
      tap(data => {
        if (generation === this.generation) {
          this.cache.set(key, data);
          this.saveCache();
        }
      }),
      finalize(() => {
        if (this.inFlight.get(key) === shared) this.inFlight.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.inFlight.set(key, shared);
    return shared;
  }

  updateVersion(version: number): void {
    if (!Number.isFinite(version) || version < 0) return;
    const viewOutdated = this.version !== version && this.versionInUse;
    if (this.version !== version) {
      this.clearCache();
      this.version = version;
      this.saveCache();
    }
    this.versionInUse = true;
    this.settleVersionCheck();
    if (viewOutdated) this.screenDataOutdated.next();
  }

  reportVersionCheckFailure(): void {
    this.settleVersionCheck();
  }

  private settleVersionCheck(): void {
    this.versionCheckSettled = true;
    this.versionCheckFinished.next();
    this.versionCheckFinished.complete();
  }
}

