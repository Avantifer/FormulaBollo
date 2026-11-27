import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Subscription } from 'rxjs';
import { environment } from '../../../../enviroments/enviroment';
import { SelectRacesComponent } from '../../../../shared/components/select-races/select-races.component';
import { AdminPriceEntry, AdminPricesUpdate } from '../../../../shared/models/admin-prices';
import { Race } from '../../../../shared/models/race';
import { FantasyApiService } from '../../../../shared/services/api/fantasy-api.service';
import { MessageInfoService } from '../../../../shared/services/toastInfo.service';

interface PriceRow extends AdminPriceEntry {
  price: number | null;
  touched: boolean;
}

@Component({
  selector: 'app-admin-prices',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectRacesComponent],
  templateUrl: './admin-prices.component.html',
  styleUrl: './admin-prices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPricesComponent implements OnDestroy {
  private readonly api = inject(FantasyApiService);
  private readonly messages = inject(MessageInfoService);
  readonly actualSeason = environment.seasonActual;
  readonly groups = signal<{ key: 'drivers' | 'teams'; label: string; rows: PriceRow[] }[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly feedback = signal('');
  readonly failed = signal(false);
  private race?: Race;
  private generation = 0;
  private load?: Subscription;
  private save?: Subscription;

  onRaceChange(race: Race): void {
    const generation = ++this.generation;
    this.load?.unsubscribe();
    this.save?.unsubscribe();
    this.race = race;
    this.groups.set([]);
    this.feedback.set('');
    this.failed.set(false);
    this.saving.set(false);
    this.loading.set(true);
    if (!race) { this.loading.set(false); return; }
    this.load = this.api.getAdminPrices(race.id).subscribe({
      next: prices => {
        if (generation !== this.generation) return;
        this.groups.set((['drivers', 'teams'] as const).map(key => ({
          key, label: key === 'drivers' ? 'Pilotos' : 'Escuderías',
          rows: prices[key].map(row => ({ ...row, price: row.storedPrice ?? row.suggestedPrice, touched: false })),
        })));
        this.loading.set(false);
      },
      error: error => {
        if (generation !== this.generation) return;
        this.loading.set(false);
        this.showError(error);
      },
    });
  }

  valid(row: PriceRow): boolean {
    return row.price !== null && Number.isInteger(row.price) && row.price >= 1_000_000 && row.price <= 30_000_000;
  }

  edit(row: PriceRow, price: number | null): void {
    row.price = price;
    this.touch(row);
  }

  touch(row: PriceRow): void {
    row.touched = true;
    this.groups.update(groups => [...groups]);
  }

  readable(price: number | null): string {
    return price === null ? 'Sin precio · Requerido' : new Intl.NumberFormat('es-ES').format(price);
  }

  savePrices(): void {
    if (!this.race || this.loading() || this.saving()) return;
    const rows = this.groups().flatMap(group => group.rows);
    if (rows.some(row => !this.valid(row) && (row.touched || row.price !== null))) {
      rows.filter(row => row.price !== null && !this.valid(row)).forEach(row => this.touch(row));
      this.messages.showWarn('Revisa los precios marcados antes de guardar');
      return;
    }
    const body: AdminPricesUpdate = { drivers: [], teams: [] };
    for (const group of this.groups()) {
      body[group.key] = group.rows.filter(row => this.valid(row)).map(row => ({ id: row.id, price: row.price! }));
    }
    if (!body.drivers.length && !body.teams.length) {
      this.messages.showWarn('Introduce algún precio para guardar');
      return;
    }
    const generation = this.generation;
    this.saving.set(true);
    this.feedback.set('');
    this.save = this.api.saveAdminPrices(this.race.id, body).subscribe({
      next: message => {
        if (generation !== this.generation) return;
        this.saving.set(false);
        this.failed.set(false);
        this.feedback.set(message);
        this.messages.showSuccess(message);
        this.groups.update(groups => groups.map(group => ({ ...group,
          rows: group.rows.map(row => this.valid(row) ? { ...row, storedPrice: row.price } : row),
        })));
      },
      error: error => {
        if (generation !== this.generation) return;
        this.saving.set(false);
        this.showError(error);
      },
    });
  }

  private showError(error: { error?: unknown }): void {
    const message = typeof error.error === 'string' ? error.error : 'No se han podido gestionar los precios';
    this.failed.set(true);
    this.feedback.set(message);
    this.messages.showError(message, error);
  }

  ngOnDestroy(): void {
    ++this.generation;
    this.load?.unsubscribe();
    this.save?.unsubscribe();
  }
}
