import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvolutionStatsComponent } from './evolution-stats.component';

describe('EvolutionStatsComponent', () => {
  let component: EvolutionStatsComponent;
  let fixture: ComponentFixture<EvolutionStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvolutionStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvolutionStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
