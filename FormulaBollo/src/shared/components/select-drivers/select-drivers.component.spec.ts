import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { driverPointsFixture, provideComponentTesting } from '../../../testing/component-test-providers';
import { DriverApiService } from '../../services/api/driver-api.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { Season } from '../../models/season';
import { ERROR_DRIVER_FETCH } from '../../../app/constants';
import { SelectDriversComponent } from './select-drivers.component';

describe('SelectDriversComponent', () => {
  let component: SelectDriversComponent;
  let fixture: ComponentFixture<SelectDriversComponent>;
  let api: jasmine.SpyObj<DriverApiService>;
  const first = driverPointsFixture.driver;
  const second = { ...first, id: 2, name: 'Segundo' };
  const season = new Season(42, 'Historica', 2);

  beforeEach(() => {
    api = jasmine.createSpyObj('DriverApiService', ['getAllDrivers']);
    api.getAllDrivers.and.returnValue(of([first, second]));
    TestBed.configureTestingModule({
      imports: [SelectDriversComponent],
      providers: [...provideComponentTesting(), { provide: DriverApiService, useValue: api }]
    });
    fixture = TestBed.createComponent(SelectDriversComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('season', season);
  });

  afterEach(() => fixture.destroy());

  it('loads by season number, preselects by position and emits user choices once', () => {
    fixture.componentRef.setInput('position', 1);
    const emit = spyOn(component.driverChanged, 'emit');
    fixture.detectChanges();
    expect(api.getAllDrivers).toHaveBeenCalledOnceWith(2);
    expect(component.drivers()).toEqual([first, second]);
    expect(component.driversForm.get('driver')!.value).toBe(second);
    expect(emit).toHaveBeenCalledOnceWith(second);
    emit.calls.reset();
    component.driversForm.get('driver')!.setValue(first);
    expect(emit).toHaveBeenCalledOnceWith(first);
  });

  it('reloads for a changed season', () => {
    fixture.detectChanges();
    api.getAllDrivers.and.returnValue(of([second]));
    fixture.componentRef.setInput('season', new Season(43, 'Siguiente', 3));
    fixture.detectChanges();
    expect(api.getAllDrivers.calls.allArgs()).toEqual([[2], [3]]);
    expect(component.drivers()).toEqual([second]);
  });

  it('accepts an empty list without inventing an option', () => {
    api.getAllDrivers.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component.drivers()).toEqual([]);
    expect(component.driversForm.get('driver')!.value).toBeFalsy();
  });

  it('reports and rethrows an API error, then permits another load', () => {
    fixture.detectChanges();
    const error = new Error('offline');
    const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
    spyOn(console, 'log');
    api.getAllDrivers.and.returnValue(throwError(() => error));
    // RxJS schedules exceptions thrown inside error callbacks with setTimeout.
    jasmine.clock().install();
    try {
      component.obtainAllDrivers();
      expect(notify).toHaveBeenCalledOnceWith(ERROR_DRIVER_FETCH, error);
      expect(() => jasmine.clock().tick(0)).toThrow(error);
    } finally {
      jasmine.clock().uninstall();
    }
    api.getAllDrivers.and.returnValue(of([second]));
    component.obtainAllDrivers();
    expect(component.drivers()).toEqual([second]);
  });

  it('selects a driver id on load and updates the id silently after loading', () => {
    fixture.componentRef.setInput('driverId', second.id);
    const emit = spyOn(component.driverChanged, 'emit');
    fixture.detectChanges();
    expect(component.driversForm.get('driver')!.value).toBe(second);
    emit.calls.reset();
    fixture.componentRef.setInput('driverId', first.id);
    fixture.detectChanges();
    expect(component.driversForm.get('driver')!.value).toBe(first);
    expect(emit).not.toHaveBeenCalled();
    fixture.componentRef.setInput('driverId', 999);
    fixture.detectChanges();
    expect(component.driversForm.get('driver')!.value).toBeNull();
    expect(emit).not.toHaveBeenCalled();
  });

  it('keeps the driver unselected when no position or id is provided', () => {
    fixture.detectChanges();
    expect(component.driversForm.get('driver')!.value).toBeNull();
  });
});
