import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriversFiltersComponent } from './teams-filters.component';

describe('DriversFiltersComponent', () => {
  let component: DriversFiltersComponent;
  let fixture: ComponentFixture<DriversFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriversFiltersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriversFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
