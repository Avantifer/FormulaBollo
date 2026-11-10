import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { HomeConfigurationComponent } from './home-configuration.component';

describe('HomeConfigurationComponent', () => {
  let component: HomeConfigurationComponent;
  let fixture: ComponentFixture<HomeConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeConfigurationComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(HomeConfigurationComponent);
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
