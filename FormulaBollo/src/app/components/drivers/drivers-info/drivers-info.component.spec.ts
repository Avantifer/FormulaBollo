import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
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
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
