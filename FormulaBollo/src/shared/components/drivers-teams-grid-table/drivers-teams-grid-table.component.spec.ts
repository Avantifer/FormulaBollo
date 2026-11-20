import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideComponentTesting, teamPointsFixture } from '../../../testing/component-test-providers';
import { TeamApiService } from '../../services/api/team-api.service';
import { ResultApiService } from '../../services/api/result-api.service';
import { DriversGridTableComponent } from './drivers-teams-grid-table.component';

describe('DriversGridTableComponent (teams)', () => {
  let fixture: ComponentFixture<DriversGridTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriversGridTableComponent],
      providers: provideComponentTesting(),
    }).compileComponents();
    spyOn(TestBed.inject(TeamApiService), 'getllTeamsWithDrivers').and.returnValue(of([
      { ...teamPointsFixture, positionChange: 'ADVANCED', positionChangeAmount: 2 },
      { ...teamPointsFixture, team: { ...teamPointsFixture.team, id: 2, name: 'Red Bull' } }
    ]));
    fixture = TestBed.createComponent(DriversGridTableComponent);
    fixture.componentRef.setInput('type', 'Equipos');
    fixture.componentRef.setInput('listValue', 'list');
  });

  afterEach(() => fixture.destroy());

  async function render() {
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 120));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('keeps team table points, position changes and profile actions', async () => {
    const drivers = spyOn(TestBed.inject(ResultApiService), 'getAllDriverPoints');
    await render();
    expect(drivers).not.toHaveBeenCalled();
    const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;
    const headers = Array.from(table.querySelectorAll('thead th'));
    const pointsIndex = headers.findIndex(header => header.textContent?.trim() === 'Puntos');
    expect(headers[pointsIndex].classList.contains('tt-points')).toBeTrue();
    const rows = table.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].cells[pointsIndex].classList.contains('tt-points')).toBeTrue();
    expect(rows[0].cells[pointsIndex].textContent?.trim()).toBe('43');
    expect(rows[0].querySelector('.sr-only')?.textContent?.trim()).toBe('Sube 2 puestos');
    expect(rows[1].querySelector('.sr-only')).toBeNull();
    expect(rows[0].querySelector('button')?.textContent).toContain('Ver escudería');
  });

  it('keeps the grid and team filtering', async () => {
    fixture.componentRef.setInput('listValue', 'grid');
    fixture.componentRef.setInput('selectedTeams', ['Red Bull']);
    await render();
    expect(fixture.nativeElement.querySelectorAll('app-team-card').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Red Bull');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });
});
