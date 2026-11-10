import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../../testing/component-test-providers';
import { Top10DriversComponent } from './top10-drivers.component';

describe('Top10DriversComponent', () => {
  let component: Top10DriversComponent;
  let fixture: ComponentFixture<Top10DriversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top10DriversComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(Top10DriversComponent);
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
