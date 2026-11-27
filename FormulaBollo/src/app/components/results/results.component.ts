import { CacheService } from '../../../shared/services/cache.service';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, Subscription } from 'rxjs';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectSeasonsComponent } from '../../../shared/components/select-seasons/select-seasons.component';
import { SelectRacesComponent } from '../../../shared/components/select-races/select-races.component';
import { Season } from '../../../shared/models/season';
import { Race } from '../../../shared/models/race';
import { Driver } from '../../../shared/models/driver';
import { Result } from '../../../shared/models/result';
import { ResultTeam } from '../../../shared/models/resultTeam';
import { Penalty } from '../../../shared/models/penalty';
import { ResultApiService } from '../../../shared/services/api/result-api.service';
import { PenaltiesApiService } from '../../../shared/services/api/penalties-api.service';
import { MessageInfoService } from '../../../shared/services/toastInfo.service';
import { ImageService } from '../../../shared/services/image.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { SpaceToUnderscorePipe } from '../../../shared/pipes/spaceToUnderscore.pipe';
import { ERROR_PENALTY_FETCH, ERROR_RESULT_FETCH } from '../../constants';

type ResultsTab = 'Pilotos' | 'Equipos' | 'Penalizaciones';

@Component({
  selector: 'app-results',
  imports: [CommonModule, RouterLink, SkeletonModule, SpaceToUnderscorePipe, SelectSeasonsComponent, SelectRacesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './results.component.html',
  styleUrl: './results.component.scss'
})
export class ResultsComponent {
  private readonly cache = inject(CacheService);
  @ViewChild(SelectRacesComponent) selectRacesComponent!: SelectRacesComponent;
  @ViewChild(SelectSeasonsComponent) selectSeasonComponent!: SelectSeasonsComponent;

  private readonly messageInfoService = inject(MessageInfoService);
  private readonly resultApiService = inject(ResultApiService);
  private readonly penaltiesApiService = inject(PenaltiesApiService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly imageService = inject(ImageService);
  protected readonly utilsService = inject(UtilsService);
  protected readonly initialSeasonNumber = Number(this.activatedRoute.snapshot.paramMap.get('season'));
  private readonly initialRaceName = (this.activatedRoute.snapshot.paramMap.get('name') ?? '').replaceAll('_', ' ');
  protected seasonSelected = new Season(this.initialSeasonNumber, 'Temporada ' + this.initialSeasonNumber, this.initialSeasonNumber);
  protected raceSelected?: Race;
  protected readonly tabs: ResultsTab[] = ['Pilotos', 'Equipos', 'Penalizaciones'];
  protected readonly activeTab = signal<ResultsTab>('Pilotos');
  protected readonly penalties = signal<Penalty[]>([]);
  protected readonly resultsDrivers = signal<Result[]>([]);
  protected readonly resultsTeams = signal<ResultTeam[]>([]);
  protected readonly teamRows = computed(() => this.resultsTeams().map(team => ({ team, drivers: team.results.slice(0, 2) })));
  protected readonly loading = signal(false);
  protected readonly teamsLoading = signal(false);
  protected readonly penaltiesLoading = signal(false);
  protected readonly keyDrivers = computed(() => [
    { label: 'Ganador', result: this.resultsDrivers().find(result => result.position?.positionNumber === 1) },
    { label: 'Pole', result: this.resultsDrivers().find(result => result.pole === 1) },
    { label: 'Vuelta Rápida', result: this.resultsDrivers().find(result => result.fastlap === 1) }
  ]);
  protected readonly severities = [
    { name: 'Grave', label: 'Graves', description: 'Penalizaciones severas que afectan significativamente.' },
    { name: 'Leve', label: 'Leves', description: 'Penalizaciones moderadas por infracciones importantes.' },
    { name: 'Aviso', label: 'Aviso', description: 'Penalizaciones menores por infracciones leves.' }
  ];
  protected readonly driverSeverities = computed(() => {
    const values = new Map<number, string>();
    for (const severity of [...this.severities].reverse()) {
      for (const penalty of this.penalties()) {
        if (penalty.penaltySeverity.severity === severity.name) values.set(penalty.driver.id, severity.name);
      }
    }
    return values;
  });
  private readonly viewReady = signal(false);
  private initialized = false;
  private loadedRaceKey?: string;
  private teamsRequested = false;
  private driversRequest?: Subscription;
  private teamsRequest?: Subscription;
  private penaltiesRequest?: Subscription;

  constructor() {
    effect(() => {
      if (this.viewReady()) this.initializeRouteRace();
    });
  }

  ngAfterViewInit(): void {
    const selectedSeason = this.selectSeasonComponent.seasons().find(season => season.number === this.initialSeasonNumber)
      ?? this.seasonSelected;
    this.selectSeasonComponent.seasonForm.get('season')!.setValue(selectedSeason);
    this.cdr.detectChanges();
    this.initializeRouteRace();
    this.viewReady.set(true);
  }

  private initializeRouteRace(): void {
    const races = this.selectRacesComponent.races();
    if (this.initialized || !races.length) return;
    const race = races.find(race => race.name === this.initialRaceName) ?? races[0];
    this.selectRacesComponent.racesForm.get('race')!.setValue(race, { emitEvent: false });
    this.initialized = true;
    this.raceSelected = race;
    this.getResults();
    this.cdr.markForCheck();
  }

  onSeasonChange(season: Season): void {
    if (this.seasonSelected.number !== season.number) {
      this.driversRequest?.unsubscribe();
      this.teamsRequest?.unsubscribe();
      this.penaltiesRequest?.unsubscribe();
    }
    this.seasonSelected = season;
    this.updateUrl();
  }

  onRaceChange(race: Race | undefined): void {
    if (!this.initialized) return;
    this.raceSelected = race;
    if (!race) {
      this.driversRequest?.unsubscribe();
      this.teamsRequest?.unsubscribe();
      this.penaltiesRequest?.unsubscribe();
      this.resultsDrivers.set([]);
      this.resultsTeams.set([]);
      this.penalties.set([]);
      this.loading.set(false);
      this.teamsLoading.set(false);
      this.penaltiesLoading.set(false);
      this.loadedRaceKey = undefined;
      this.teamsRequested = false;
      return;
    }
    if (this.loadedRaceKey !== this.seasonSelected.number + '/' + race.id) this.getResults();
    this.updateUrl();
  }

  private updateUrl(): void {
    if (!this.initialized || !this.raceSelected) return;
    const name = this.utilsService.spaceToUnderScore(this.raceSelected.name);
    const params = this.activatedRoute.snapshot.paramMap;
    if (params.get('name') === name && Number(params.get('season')) === this.seasonSelected.number) return;
    void this.router.navigate(['/results', name, this.seasonSelected.number], { replaceUrl: true });
  }

  selectTab(tab: ResultsTab): void {
    this.activeTab.set(tab);
    if (tab === 'Equipos' && this.raceSelected && !this.teamsRequested) this.getResultsTeams();
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % this.tabs.length; break;
      case 'ArrowLeft': next = (index + this.tabs.length - 1) % this.tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = this.tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    this.selectTab(this.tabs[next]);
    const tablist = (event.currentTarget as HTMLElement).parentElement!;
    tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next].focus();
  }

  protected getRacePoints(result: Result): number | 'DNF' | 'DNF +1' {
    if (result.position === null) return result.fastlap === 1 ? 'DNF +1' : 'DNF';
    return result.position.points + (result.fastlap ?? 0);
  }

  protected isVacantDriver(driver: Driver): boolean {
    return /^vacante\d*$/i.test(driver.name);
  }

  protected driverInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    return (words[0].charAt(0) + (words.length > 1 ? words.at(-1)!.charAt(0) : words[0].charAt(1))).toUpperCase();
  }

  getResults(): void {
    if (!this.raceSelected) return;
    const raceId = this.raceSelected.id;
    this.driversRequest?.unsubscribe();
    this.teamsRequest?.unsubscribe();
    this.penaltiesRequest?.unsubscribe();
    this.loadedRaceKey = this.seasonSelected.number + '/' + this.raceSelected.id;
    this.teamsRequested = false;
    this.loading.set(true);
    this.teamsLoading.set(false);
    this.driversRequest = this.cache.refreshOnPublish(() => this.resultApiService.getAllResultsPerRacePilots(raceId)).pipe(
      catchError(error => {
        this.messageInfoService.showError(ERROR_RESULT_FETCH, error);
        console.error(error);
        return of([]);
      })
    ).subscribe(results => {
      this.resultsDrivers.set(results);
      this.loading.set(false);
    });
    if (this.activeTab() === 'Equipos') this.getResultsTeams();
    this.getPenalties();
  }

  private getResultsTeams(): void {
    this.teamsRequested = true;
    this.teamsLoading.set(true);
    this.teamsRequest = this.cache.refreshOnPublish(() => this.resultApiService.getAllResultsPerRaceTeams(this.raceSelected!.id)).pipe(
      catchError(error => {
        this.messageInfoService.showError(ERROR_RESULT_FETCH, error);
        console.error(error);
        return of([]);
      })
    ).subscribe(results => {
      this.resultsTeams.set(results);
      this.teamsLoading.set(false);
    });
  }

  getPenalties(): void {
    if (!this.raceSelected) return;
    const raceId = this.raceSelected.id;
    this.penaltiesRequest?.unsubscribe();
    this.penaltiesLoading.set(true);
    this.penaltiesRequest = this.cache.refreshOnPublish(() => this.penaltiesApiService.getPenaltiesByRace(raceId)).pipe(
      catchError(error => {
        this.messageInfoService.showError(ERROR_PENALTY_FETCH, error);
        console.error(error);
        return of([]);
      })
    ).subscribe(penalties => {
      this.penalties.set(penalties);
      this.penaltiesLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.driversRequest?.unsubscribe();
    this.teamsRequest?.unsubscribe();
    this.penaltiesRequest?.unsubscribe();
  }
}
