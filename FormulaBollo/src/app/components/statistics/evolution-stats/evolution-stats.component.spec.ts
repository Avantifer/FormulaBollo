import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { EvolutionStatsComponent } from './evolution-stats.component';

describe('EvolutionStatsComponent', () => {
  let component: EvolutionStatsComponent;
  let fixture: ComponentFixture<EvolutionStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvolutionStatsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(EvolutionStatsComponent);
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
