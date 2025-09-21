import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriversGridTableComponent } from './drivers-teams-grid-table.component';

describe('DriversGridTableComponent', () => {
  let component: DriversGridTableComponent;
  let fixture: ComponentFixture<DriversGridTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriversGridTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriversGridTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
