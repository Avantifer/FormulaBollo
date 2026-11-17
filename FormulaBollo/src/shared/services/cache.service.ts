import { Injectable, signal } from '@angular/core';
import { CACHE_NAME_LOCAL_STORAGE } from '../../../src/app/constants';
import { defer, finalize, Observable, of, shareReplay, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache: Map<string, any>;
  private readonly inFlight = new Map<string, Observable<unknown>>();
  private generation = 0;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  readonly isVersionRetrieved = signal(false);
  
  constructor() {
    this.cache = this.loadCache();
  }

  isValidCache(actualCacheVersion: number): boolean {
    const previousCache: number = localStorage.getItem(CACHE_NAME_LOCAL_STORAGE) ? parseInt(localStorage.getItem(CACHE_NAME_LOCAL_STORAGE)!) : 0;
    
    return actualCacheVersion === previousCache; 
  }

  setCache(cacheVersion: number): void {
    localStorage.setItem(CACHE_NAME_LOCAL_STORAGE, cacheVersion.toString());
  }

  loadCache(): Map<string, any> {
    const storedCache = localStorage.getItem('apiCache');
    if (this.cache) return this.cache;
    try {
      this.cache = storedCache ? new Map(JSON.parse(storedCache)) : new Map();
    } catch {
      this.cache = new Map();
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
        const serialized = JSON.stringify(Array.from(this.cache.entries()));
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

  removeByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
    this.saveCache();
  }

  clearCache(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    this.generation++;
    this.cache.clear();
    this.inFlight.clear();
    this.removePersistedCache();
  }

  getOrLoad<T>(key: string, request: () => Observable<T>): Observable<T> {
    return defer(() => {
      if (this.cache.has(key)) return of(this.cache.get(key) as T);
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
    });
  }

  updateVersion(version: number): void {
    if (!Number.isFinite(version) || version < 0) return;
    if (!this.isValidCache(version)) this.clearCache();
    this.setCache(version);
    this.isVersionRetrieved.set(true);
  }
}

