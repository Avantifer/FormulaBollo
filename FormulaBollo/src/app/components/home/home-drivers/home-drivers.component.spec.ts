import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { driverPointsFixture, provideComponentTesting } from '../../../../testing/component-test-providers';
import { DriverApiService } from '../../../../shared/services/api/driver-api.service';
import { ResultApiService } from '../../../../shared/services/api/result-api.service';
import { DriverPoints } from '../../../../shared/models/driverPoints';
import { environment } from '../../../../enviroments/enviroment';
import { HomeDriversComponent } from './home-drivers.component';

// Empty/error and single-driver fallback regressions are covered in frontend-regressions.spec.ts.
describe('HomeDriversComponent ranking and retry', () => {
  let fixture: ComponentFixture<HomeDriversComponent>;
  let points: jasmine.SpyObj<ResultApiService>;
  let drivers: jasmine.SpyObj<DriverApiService>;
  const ranking = [driverPointsFixture, {
    ...driverPointsFixture, totalPoints: 18,
    driver: { ...driverPointsFixture.driver, id: 2, name: 'Segundo' }
  }, {
    ...driverPointsFixture, totalPoints: 10,
    driver: { ...driverPointsFixture.driver, id: 3, name: 'Tercero' }
  }];

  beforeEach(() => {
    points = jasmine.createSpyObj('ResultApiService', ['getAllDriverPoints']);
    drivers = jasmine.createSpyObj('DriverApiService', ['getAllDrivers']);
    points.getAllDriverPoints.and.returnValue(of(ranking));
    drivers.getAllDrivers.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [HomeDriversComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: ResultApiService, useValue: points },
        { provide: DriverApiService, useValue: drivers }
      ]
    });
    fixture = TestBed.createComponent(HomeDriversComponent);
  });

  afterEach(() => fixture.destroy());

  it('shows loading until points arrive, then renders the ranking and podium order', async () => {
    const response = new Subject<DriverPoints[]>();
    points.getAllDriverPoints.and.returnValue(response);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
    response.next(ranking);
    await fixture.whenStable();
    expect(points.getAllDriverPoints).toHaveBeenCalledOnceWith(environment.seasonActual.number, 10);
    expect(drivers.getAllDrivers).not.toHaveBeenCalled();
    expect((fixture.componentInstance as any).top3DriverPoints).toEqual([ranking[1], ranking[0], ranking[2]]);
    expect((fixture.componentInstance as any).driverPoints()).toEqual(ranking);
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Segundo');
    expect(fixture.nativeElement.textContent).toContain('Tercero');
  });

  it('recovers through the rendered retry button after the API fails', async () => {
    points.getAllDriverPoints.and.returnValue(throwError(() => new Error('offline')));
    spyOn(console, 'error');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    points.getAllDriverPoints.and.returnValue(of(ranking));
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(points.getAllDriverPoints).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Segundo');
  });

  it('cancels the pending request when the component is destroyed', () => {
    const response = new Subject<DriverPoints[]>();
    points.getAllDriverPoints.and.returnValue(response);
    fixture.detectChanges();
    fixture.destroy();
    expect(response.observed).toBeFalse();
    response.next(ranking);
    expect((fixture.componentInstance as any).driverPoints()).toEqual([]);
  });
});
