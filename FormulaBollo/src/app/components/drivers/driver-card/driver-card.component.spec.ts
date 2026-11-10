import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting, driverPointsFixture } from '../../../../testing/component-test-providers';
import { DriverCardComponent } from './driver-card.component';

describe('DriverCardComponent', () => {
  let component: DriverCardComponent;
  let fixture: ComponentFixture<DriverCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverCardComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(DriverCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('driverPoint', driverPointsFixture);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
