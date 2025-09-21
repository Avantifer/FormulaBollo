import { HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { CacheService } from "./cache.service";

@Injectable({
  providedIn: "root",
})
export class BaseApiService  {

  constructor(private readonly cacheService: CacheService) { }

  public createParams(params: { [key: string]: any }): HttpParams {
    let httpParams = new HttpParams();

    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    
    return httpParams;
  }
}