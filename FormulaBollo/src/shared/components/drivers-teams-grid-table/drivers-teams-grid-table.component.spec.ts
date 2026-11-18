import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting, driverPointsFixture } from '../../../testing/component-test-providers';
import { ResultApiService } from '../../services/api/result-api.service';
import { of } from 'rxjs';
import { DriversGridTableComponent } from './drivers-teams-grid-table.component';

describe('DriversGridTableComponent', () => {
  let component: DriversGridTableComponent;
  let fixture: ComponentFixture<DriversGridTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriversGridTableComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(DriversGridTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('type', 'Pilotos');
    fixture.componentRef.setInput('listValue', 'list');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marks the points column and announces position gains without announcing SAME', async () => {
    spyOn(TestBed.inject(ResultApiService), 'getAllDriverPoints').and.returnValue(of([
      { ...driverPointsFixture, positionChange: 'ADVANCED', positionChangeAmount: 2 },
      {
        ...driverPointsFixture,
        driver: { ...driverPointsFixture.driver, id: 2, name: 'Segundo piloto' },
      },
    ]));
    fixture.componentRef.setInput('season', { ...component.season() });
    fixture.detectChanges();
    // The component delays the API response by 100 ms; zoneless stability does not await that timer.
    await new Promise(resolve => setTimeout(resolve, 110));
    await fixture.whenStable();
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;
    const headers = Array.from(table.querySelectorAll('thead th'));
    const pointsIndex = headers.findIndex(header => header.textContent?.trim() === 'Puntos');
    expect(pointsIndex).toBeGreaterThan(-1);
    expect(headers[pointsIndex].classList.contains('tt-points')).toBeTrue();

    const rows = table.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].cells[pointsIndex].classList.contains('tt-points')).toBeTrue();
    expect(rows[0].cells[pointsIndex].textContent?.trim()).toBe('25');
    expect(rows[0].querySelector('.sr-only')?.textContent?.trim()).toBe('Sube 2 puestos');
    expect(rows[0].querySelector('.pi-arrow-up')?.getAttribute('aria-hidden')).toBe('true');
    expect(rows[1].querySelector('.sr-only')).toBeNull();
    expect(rows[1].querySelector('.pi-arrow-up, .pi-arrow-down')).toBeNull();
  });
});
