import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ResolveFn, RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const nameTitleResolver: ResolveFn<string> = route =>
  (route.paramMap.get('name') ?? '').replaceAll('_', ' ').trim();

export const resultsTitleResolver: ResolveFn<string> = route =>
  `Resultados · ${(route.paramMap.get('name') ?? '').replaceAll('_', ' ').trim()} · Temporada ${route.paramMap.get('season')}`;

export function driverSeasonTitle(name: string, season: number): string {
  return `${name} · ${season ? `Temporada ${season}` : 'Total'} · FormulaBollo`;
}

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    // The season selector navigates with query parameters. Preserve its title
    // when the router finishes that navigation, including returning to Total.
    if (route.routeConfig?.path === 'drivers/:name' && pageTitle) {
      const season = route.queryParamMap.get('season');
      this.title.setTitle(driverSeasonTitle(pageTitle, season && /^\d+$/.test(season) ? Number(season) : 0));
      return;
    }
    this.title.setTitle(pageTitle ? `${pageTitle} · FormulaBollo` : 'FormulaBollo');
  }
}
