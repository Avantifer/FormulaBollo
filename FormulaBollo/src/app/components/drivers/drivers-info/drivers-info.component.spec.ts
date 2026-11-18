import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting, driverPointsFixture } from '../../../../testing/component-test-providers';
import { DriverInfo } from '../../../../shared/models/driverInfo';
import { DriversInfoComponent } from './drivers-info.component';

describe('DriversInfoComponent', () => {
  let component: DriversInfoComponent;
  let fixture: ComponentFixture<DriversInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriversInfoComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(DriversInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders one h1 before loading and replaces it with the driver name', () => {
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    component['driverInfo'].set({
      driver: driverPointsFixture.driver,
      poles: 0, fastlaps: 0, racesFinished: 0, totalPoints: 0,
      championships: 0, penalties: 0, bestPosition: 0,
      podiums: 0, victories: 0, averagePosition: 0,
      last5Results: [] as unknown as DriverInfo['last5Results'],
    });
    fixture.detectChanges();

    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent.trim()).toBe(driverPointsFixture.driver.name);
    expect(headings[0].classList.contains('sr-only')).toBeFalse();
  });

  it('renders recent results as a timing tower with team borders, points and accented status labels', () => {
    const race = {
      id: 1, name: 'Carrera de prueba', flagImage: 'flag.png', circuitImage: 'circuit.png',
      dateStart: new Date('2026-01-01'), season: driverPointsFixture.driver.season, finished: 1,
    };
    component['driverInfo'].set({
      driver: driverPointsFixture.driver,
      poles: 0, fastlaps: 0, racesFinished: 0, totalPoints: 0,
      championships: 0, penalties: 0, bestPosition: 0,
      podiums: 0, victories: 0, averagePosition: 0,
      last5Results: [1, 0].map(fastlap => ({
        race, driver: driverPointsFixture.driver,
        position: { id: 1, positionNumber: fastlap === 1 ? 1 : 2, points: 25 },
        fastlap, pole: 1 - fastlap,
      })) as unknown as DriverInfo['last5Results'],
    });
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('p-table') as HTMLElement;
    expect(table).not.toBeNull();
    expect(table.classList.contains('timing-tower')).toBeTrue();
    expect(table.querySelectorAll('thead th.tt-points').length).toBe(1);
    expect(table.querySelectorAll('thead th.tt-actions').length).toBe(1);
    const rows = table.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(rows.length).toBe(2);
    rows.forEach((row, index) => {
      expect(row.cells[0].classList.contains('border-Ferrari')).toBeTrue();
      expect(row.querySelectorAll('td.tt-points').length).toBe(1);
      expect(row.querySelector('td.tt-points')?.textContent?.trim()).toBe('+25');
      expect(row.cells[1].textContent?.trim()).toBe(index === 0 ? 'Sí' : 'No');
      expect(row.cells[2].textContent?.trim()).toBe(index === 0 ? 'No' : 'Sí');
    });
  });
});
