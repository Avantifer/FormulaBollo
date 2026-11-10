import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { RaceDetailsComponent } from './race-details.component';

describe('RaceDetailsComponent', () => {
  let component: RaceDetailsComponent;
  let fixture: ComponentFixture<RaceDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaceDetailsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(RaceDetailsComponent);
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
