import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { ComparativeStatsComponent } from './comparative-stats.component';

describe('ComparativeStatsComponent', () => {
  let component: ComparativeStatsComponent;
  let fixture: ComponentFixture<ComparativeStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComparativeStatsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(ComparativeStatsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('typeSelected', 'Pilotos');
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
