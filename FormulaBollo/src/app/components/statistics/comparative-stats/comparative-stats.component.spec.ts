import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComparativeStatsComponent } from './comparative-stats.component';

describe('ComparativeStatsComponent', () => {
  let component: ComparativeStatsComponent;
  let fixture: ComponentFixture<ComparativeStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComparativeStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComparativeStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
