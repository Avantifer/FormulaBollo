import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, Injector, OnDestroy, signal, Signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChartData } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { catchError, defaultIfEmpty, forkJoin, lastValueFrom, Observable, Subject, Subscription, takeUntil } from 'rxjs';
import { colorsMappings, ERROR_FANTASY_ELECTION_NOT_FOUND, ERROR_PRICE_FETCH, ERROR_RACE_FETCH, getLineChartOptions } from '../../../constants';
import { environment } from '../../../../enviroments/enviroment';
import { SelectRacesComponent } from '../../../../shared/components/select-races/select-races.component';
import { FantasyElection } from '../../../../shared/models/fantasyElection';
import { FantasyPricesDriver } from '../../../../shared/models/fantasyPricesDriver';
import { FantasyPricesTeam } from '../../../../shared/models/fantasyPricesTeam';
import { Race } from '../../../../shared/models/race';
import { SpaceToUnderscorePipe } from '../../../../shared/pipes/spaceToUnderscore.pipe';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { RaceApiService } from '../../../../shared/services/api/race-api.service';
import { ImageService } from '../../../../shared/services/image.service';
import { ThemeService } from '../../../../shared/services/theme.service';
import { UtilsService } from '../../../../shared/services/utils.service';
import {
  bandCounts, bestValueId, Candidate, candidateId, candidateName, emptySlots, emptyTeam, FANTASY_BUDGET, formatDecimals, formatDeparture, formatMoney, formatSignedMoney,
  isDriver, nextEmptySlot, nextSlot, Outcome, outcomeOf, pointsPerMillion, PriceBand, priceBand, remainingBudget, SAVE_BLOCK_MESSAGE,
  SAVE_DEADLINE_HOURS, saveBlock, SlotRef, SortKey, sortCandidates, teamCost, TeamState
} from './fantasy-team.helpers';

export interface TeamSlotView {
  ref: SlotRef;
  label: string;
  active: boolean;
  filled: boolean;
  name: string;
  detail: string;
  image: string;
  teamName: string;
  price: number | null;
}

export interface CandidateRow {
  item: Candidate;
  id: number;
  name: string;
  detail: string;
  image: string;
  teamName: string;
  price: number;
  points: number;
  ppm: number;
  diff: number;
  best: boolean;
  inTeam: boolean;
  outcome: Outcome | null;
  priceDelta: number | null;
  pointsDelta: number | null;
  state: 'add' | 'swap' | 'in-team' | 'no-fit';
}

export interface ChartView {
  item: Candidate;
  tab: 'points' | 'prices';
  loading: boolean;
  points: ChartData<'line'> | null;
  prices: ChartData<'line'> | null;
  best: number;
  average: number;
  start: number;
  max: number;
}

interface SeriesEntry {
  race: Race;
  points?: number;
  price?: number;
}

const plain = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'points', label: 'Puntos' },
  { key: 'price', label: 'Precio' },
  { key: 'ppm', label: 'Puntos por M' },
  { key: 'diff', label: 'Variación' },
  { key: 'name', label: 'Nombre' }
];

export const BAND_OPTIONS: { key: PriceBand | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'low', label: 'Hasta $5M' },
  { key: 'mid', label: '$5M a $15M' },
  { key: 'high', label: 'Más de $15M' }
];

@Component({
  selector: 'app-fantasy-team',
  imports: [ButtonModule, ChartModule, DialogModule, SelectRacesComponent, SpaceToUnderscorePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fantasy-team.component.html',
  styleUrl: './fantasy-team.component.scss'
})
export class FantasyTeamComponent implements OnDestroy {
  private readonly fantasyApiService: FantasyApiService = inject(FantasyApiService);
  private readonly raceApiService: RaceApiService = inject(RaceApiService);
  private readonly themeService: ThemeService = inject(ThemeService);
  protected readonly utilsService: UtilsService = inject(UtilsService);
  protected readonly imageService: ImageService = inject(ImageService);

  readonly electionEnabled = false;
  readonly budget = FANTASY_BUDGET;
  readonly deadlineHours = SAVE_DEADLINE_HOURS;
  readonly sortOptions = SORT_OPTIONS;
  readonly bandOptions = BAND_OPTIONS;
  protected readonly formatMoney = formatMoney;
  protected readonly formatSignedMoney = formatSignedMoney;
  protected readonly decimals = formatDecimals;
  protected readonly candidateName = candidateName;
  protected readonly Math = Math;

  readonly lineChartOptions = computed(() => getLineChartOptions(this.themeService.isDarkTheme(), false));

  readonly isLastRace = computed(() => {
    const last = this.lastRace();
    const race = this.selectedRace();
    return !last || !race || race.id === last.id;
  });
  private readonly selectedRace = signal<Race | undefined>(undefined);

  get raceSelected(): Race | undefined {
    return this.selectedRace();
  }

  set raceSelected(race: Race | undefined) {
    this.selectedRace.set(race);
  }

  readonly fantasyPricesDrivers = signal<FantasyPricesDriver[]>([]);
  readonly fantasyPricesTeams = signal<FantasyPricesTeam[]>([]);
  readonly team = signal<TeamState>(emptyTeam());
  readonly savedElection = signal<FantasyElection | undefined>(undefined);
  readonly savedState = signal<'loading' | 'ready' | 'none'>('loading');
  readonly announcement = signal('');
  readonly active = signal<SlotRef | null>({ kind: 'driver', index: 0 });

  readonly query = signal('');
  readonly band = signal<PriceBand | 'all'>('all');
  readonly sortKey = signal<SortKey>('points');
  readonly descending = signal(true);
  readonly chart = signal<ChartView | null>(null);

  private readonly destroy$: Subject<void> = new Subject<void>();
  private loadedRaceId: number | undefined;
  private electionRequest: Subscription | undefined;
  private chartOpener: HTMLElement | null = null;
  private readonly injector = inject(Injector);
  private readonly lastRace: Signal<Race | undefined> = toSignal(this.raceApiService.getActualRace(environment.seasonActual.id)
    .pipe(catchError(error => this.utilsService.handleError<Race>(ERROR_RACE_FETCH, error))));

  readonly cost = computed(() => teamCost(this.team()));
  readonly remaining = computed(() => remainingBudget(this.team()));
  readonly missing = computed(() => emptySlots(this.team()));
  readonly missingText = computed(() => {
    const names = this.missing().map(slot => this.slotLabel(slot));
    return names.length ? 'Faltan ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' y ' + names.at(-1) : names[0]) + '.' : '';
  });
  readonly block = computed(() => saveBlock(this.electionEnabled, this.team(), this.raceSelected?.dateStart, new Date()));
  readonly blockMessage = computed(() => this.block() ? SAVE_BLOCK_MESSAGE[this.block()!] : null);
  readonly departure = computed(() => this.raceSelected?.dateStart ? formatDeparture(this.raceSelected.dateStart) : '');

  readonly slots = computed<TeamSlotView[]>(() => {
    const active = this.isLastRace() ? this.active() : null;
    const election = this.savedElection();
    const refs: SlotRef[] = [
      { kind: 'driver', index: 0 }, { kind: 'driver', index: 1 }, { kind: 'driver', index: 2 },
      { kind: 'team', index: 0 }, { kind: 'team', index: 1 }
    ];
    return refs.map(ref => {
      const base = { ref, label: this.slotLabel(ref), active: !!active && active.kind === ref.kind && active.index === ref.index };
      if (!this.isLastRace()) {
        const driver = ref.kind === 'driver' ? [election?.driverOne, election?.driverTwo, election?.driverThree][ref.index] : undefined;
        const team = ref.kind === 'team' ? [election?.teamOne, election?.teamTwo][ref.index] : undefined;
        return {
          ...base, filled: !!(driver ?? team), price: null,
          name: (driver?.name ?? team?.name ?? '').trim(), detail: driver?.team?.name ?? '',
          image: driver?.driverImage ?? team?.carImage ?? '', teamName: driver?.team?.name ?? team?.name ?? ''
        };
      }
      const item = ref.kind === 'driver' ? this.team().drivers[ref.index] : this.team().teams[ref.index];
      return {
        ...base, filled: !!item, price: item?.price ?? null,
        name: item ? candidateName(item) : '', detail: item && isDriver(item) ? item.driver.team.name : '',
        image: item ? this.imageOf(item) : '', teamName: item ? this.teamNameOf(item) : ''
      };
    });
  });

  readonly segments = computed(() => {
    const total = Math.max(this.cost(), FANTASY_BUDGET);
    return this.slots().filter(slot => slot.filled && slot.price).map(slot => ({
      key: slot.label, name: slot.name, teamName: slot.teamName, width: slot.price! / total * 100
    }));
  });

  readonly pool = computed<Candidate[]>(() => this.active()?.kind === 'team' ? this.fantasyPricesTeams() : this.fantasyPricesDrivers());
  readonly counts = computed(() => bandCounts(this.pool()));
  readonly bestId = computed(() => bestValueId(this.pool()));
  private readonly occupant = computed(() => {
    const slot = this.active();
    return slot ? (slot.kind === 'driver' ? this.team().drivers[slot.index] : this.team().teams[slot.index]) : undefined;
  });

  readonly rows = computed<CandidateRow[]>(() => {
    const slot = this.active();
    if (!slot || !this.isLastRace()) return [];
    const query = this.query().trim();
    const band = this.band();
    const filtered = this.pool().filter(item => (!query || plain(candidateName(item)).includes(plain(query))) && (band === 'all' || priceBand(item.price) === band));
    const state = this.team();
    const chosen = new Set((slot.kind === 'driver' ? state.drivers : state.teams).filter(Boolean).map(item => candidateId(item!)));
    const current = this.occupant();
    const bestId = this.bestId();
    return sortCandidates(filtered, this.sortKey(), this.descending()).map(item => {
      const inTeam = chosen.has(candidateId(item));
      const outcome = inTeam ? null : outcomeOf(state, slot, item, this.fantasyPricesDrivers(), this.fantasyPricesTeams());
      return {
        item, id: candidateId(item), name: candidateName(item), detail: isDriver(item) ? item.driver.team.name : '',
        image: this.imageOf(item), teamName: this.teamNameOf(item), price: item.price, points: item.fantasyInfo.totalPoints,
        ppm: pointsPerMillion(item), diff: item.fantasyInfo.differencePrice, best: candidateId(item) === bestId, inTeam, outcome,
        priceDelta: current && !inTeam ? item.price - current.price : null,
        pointsDelta: current && !inTeam ? item.fantasyInfo.totalPoints - current.fantasyInfo.totalPoints : null,
        state: inTeam ? 'in-team' : !outcome!.fits ? 'no-fit' : current ? 'swap' : 'add'
      };
    });
  });

  readonly activeSlot = computed(() => this.slots().find(slot => slot.active));
  readonly panelTitle = computed(() => this.active() ? (this.activeSlot()?.filled ? 'Cambiar ' : 'Elegir ') + this.slotLabel(this.active()!) : '');
  readonly nextLabel = computed(() => {
    const slot = this.active();
    if (!slot || this.activeSlot()?.filled) return '';
    const others = this.missing().filter(item => item.kind !== slot.kind || item.index !== slot.index);
    const after = nextSlot(others, slot);
    return after ? this.slotLabel(after) : '';
  });
  readonly averagePerSlot = computed(() => this.missing().length ? this.remaining() / this.missing().length : 0);

  constructor() {
    effect(() => {
      const last = this.lastRace();
      if (last && !untracked(() => this.raceSelected)) this.raceSelected = last;
    });
    effect(() => {
      const race = this.selectedRace();
      const last = this.lastRace();
      if (!race || !last) return;
      untracked(() => race.id === last.id ? this.ensurePrices() : this.loadSavedElection(race));
    });
  }

  slotLabel(slot: SlotRef): string {
    return (slot.kind === 'driver' ? 'Piloto ' : 'Equipo ') + (slot.index + 1);
  }

  private imageOf(item: Candidate): string {
    return isDriver(item) ? item.driver.driverImage : item.team.carImage;
  }

  private teamNameOf(item: Candidate): string {
    return isDriver(item) ? item.driver.team.name : item.team.name;
  }

  activate(slot: SlotRef): void {
    if (!this.isLastRace()) return;
    this.active.set(slot);
    this.query.set('');
    this.band.set('all');
  }

  remove(slot: SlotRef): void {
    const previous = (slot.kind === 'driver' ? this.team().drivers[slot.index] : this.team().teams[slot.index]);
    this.team.update(state => ({
      drivers: state.drivers.map((item, index) => slot.kind === 'driver' && index === slot.index ? undefined : item),
      teams: state.teams.map((item, index) => slot.kind === 'team' && index === slot.index ? undefined : item)
    }));
    this.announcement.set(previous ? 'Quitado ' + candidateName(previous) + ' de ' + this.slotLabel(slot) + '.' : '');
    this.activate(slot);
    this.focusSlot(slot);
  }

  private focusSlot(slot: SlotRef): void {
    afterNextRender(() => document.getElementById('slot-' + slot.kind + '-' + slot.index)?.focus(), { injector: this.injector });
  }

  choose(row: CandidateRow): void {
    const slot = this.active();
    if (!slot || !this.isLastRace() || row.state === 'in-team' || row.state === 'no-fit') return;
    const next: TeamState = {
      drivers: this.team().drivers.map((item, index) => slot.kind === 'driver' && index === slot.index ? row.item as FantasyPricesDriver : item),
      teams: this.team().teams.map((item, index) => slot.kind === 'team' && index === slot.index ? row.item as FantasyPricesTeam : item)
    };
    const wasFilled = !!(slot.kind === 'driver' ? this.team().drivers[slot.index] : this.team().teams[slot.index]);
    this.team.set(next);
    this.announcement.set('Añadido ' + row.name + ' en ' + this.slotLabel(slot) + '. Te quedan ' + formatMoney(remainingBudget(next)) + '.');
    const target = wasFilled ? slot : nextEmptySlot(next, slot) ?? slot;
    this.active.set(target);
    this.query.set('');
    this.band.set('all');
    this.focusSlot(target);
  }

  sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.descending.update(value => !value);
    } else {
      this.sortKey.set(key);
      this.descending.set(key !== 'name');
    }
  }

  private ensurePrices(): void {
    const race = this.raceSelected;
    if (!race || this.loadedRaceId === race.id) return;
    this.loadedRaceId = race.id;
    void this.getDriversTeamPrices();
  }

  async getDriversTeamPrices(): Promise<void> {
    const raceId = this.raceSelected!.id;
    const prices = await lastValueFrom(forkJoin({
      drivers: this.fantasyApiService.getAllPricesDriver(raceId).pipe(
        catchError(error => this.utilsService.handleError<FantasyPricesDriver[]>(ERROR_PRICE_FETCH, error, []))
      ),
      teams: this.fantasyApiService.getAllPricesTeam(raceId).pipe(
        catchError(error => this.utilsService.handleError<FantasyPricesTeam[]>(ERROR_PRICE_FETCH, error, []))
      )
    }).pipe(takeUntil(this.destroy$)), { defaultValue: undefined });
    if (!prices) return;
    this.fantasyPricesDrivers.set(prices.drivers);
    this.fantasyPricesTeams.set(prices.teams);
  }

  onRaceChange(newRace: Race): void {
    if (newRace) this.raceSelected = newRace;
  }

  private loadSavedElection(race: Race): void {
    this.electionRequest?.unsubscribe();
    this.savedElection.set(undefined);
    this.savedState.set('loading');
    this.electionRequest = this.fantasyApiService.getFantasyElection(race.id).pipe(
      takeUntil(this.destroy$),
      catchError(error => this.utilsService.handleError<FantasyElection>(ERROR_FANTASY_ELECTION_NOT_FOUND, error)),
      defaultIfEmpty(undefined)
    ).subscribe(election => {
      if (this.selectedRace()?.id !== race.id) return;
      const picks = election ? [election.driverOne, election.driverTwo, election.driverThree, election.teamOne, election.teamTwo] : [];
      this.savedElection.set(election);
      this.savedState.set(picks.some(Boolean) ? 'ready' : 'none');
    });
  }

  openChart(item: Candidate): void {
    this.chartOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.chart.set({ item, tab: 'points', loading: true, points: null, prices: null, best: 0, average: 0, start: 0, max: 0 });
    const points$: Observable<SeriesEntry[]> = isDriver(item) ? this.fantasyApiService.getDriverPoints(item.driver.id) : this.fantasyApiService.getTeamPoints(item.team.id);
    const prices$: Observable<SeriesEntry[]> = isDriver(item) ? this.fantasyApiService.getDriverPrices(item.driver.id) : this.fantasyApiService.getTeamPrices(item.team.id);
    const color = colorsMappings[this.teamNameOf(item)] || '#888888';
    const build = (entries: SeriesEntry[], value: (entry: SeriesEntry) => number): ChartData<'line'> => ({
      labels: entries.map(entry => entry.race.name),
      datasets: [{
        data: entries.map(value), borderColor: color, backgroundColor: color, pointBackgroundColor: color, pointBorderColor: '#fff',
        pointBorderWidth: 2, fill: false, tension: 0.3, pointRadius: 4, pointHoverRadius: 6
      }]
    });
    const safe = (request: Observable<SeriesEntry[]>) => request.pipe(
      takeUntil(this.destroy$),
      catchError(error => this.utilsService.handleError<SeriesEntry[]>(ERROR_PRICE_FETCH, error, []))
    );
    forkJoin({ points: safe(points$), prices: safe(prices$) }).subscribe(({ points, prices }) => {
      const current = this.chart();
      if (!current || current.item !== item) return;
      this.chart.set({
        ...current,
        loading: false,
        points: points.length ? build(points, entry => entry.points!) : null,
        prices: prices.length ? build(prices, entry => parseFloat(entry.price!.toFixed(2))) : null,
        best: points.length ? Math.max(...points.map(entry => entry.points!)) : 0,
        average: points.length ? points.reduce((total, entry) => total + entry.points!, 0) / points.length : 0,
        start: prices.length ? prices[0].price! : 0,
        max: prices.length ? Math.max(...prices.map(entry => entry.price!)) : 0
      });
    });
  }

  onTabKey(event: KeyboardEvent, current: 'points' | 'prices'): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'points' : event.key === 'End' ? 'prices' : current === 'points' ? 'prices' : 'points';
    this.chartTab(next);
    afterNextRender(() => document.getElementById('chart-tab-' + next)?.focus(), { injector: this.injector });
  }

  setSort(key: SortKey): void {
    this.sortKey.set(key);
    this.descending.set(key !== 'name');
  }

  flipOrder(): void {
    this.descending.update(value => !value);
  }

  chartTab(tab: 'points' | 'prices'): void {
    this.chart.update(current => current ? { ...current, tab } : current);
  }

  @HostListener('document:keydown.escape')
  closeChart(): void {
    if (!this.chart()) return;
    this.chart.set(null);
    const opener = this.chartOpener;
    this.chartOpener = null;
    afterNextRender(() => opener?.focus(), { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
