import { Injectable } from '@angular/core';
import { CACHE_NAME_LOCAL_STORAGE } from '../../../src/app/constants';
import { environment } from '../../enviroments/enviroment';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache: Map<string, any>;
  public isVersionRetrieved: boolean = false;
  
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
    this.cache = storedCache ? new Map(JSON.parse(storedCache)) : new Map();
    return this.cache;
  }

  getCache(): Map<string, any> {
    return this.cache;
  }

  saveCache(): void {
    localStorage.setItem('apiCache', JSON.stringify(Array.from(this.cache.entries())));
  }

  clearCache(): void {
    const cacheKeys = Array.from(this.cache.keys()).filter(key => 
        key.includes(environment.seasonActual.number.toString()) || 
        key.includes('0') || 
        key.includes('Configurations')
    );
    cacheKeys.forEach(key => this.cache.delete(key));
    this.saveCache();
    localStorage.removeItem('apiCache');
  }
}

