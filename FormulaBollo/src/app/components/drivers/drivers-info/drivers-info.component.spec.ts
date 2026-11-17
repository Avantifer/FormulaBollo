import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
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
});
