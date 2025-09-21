import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectPenaltySeveritiesComponent } from './select-penalty-severities.component';

describe('SelectPenaltySeveritiesComponent', () => {
  let component: SelectPenaltySeveritiesComponent;
  let fixture: ComponentFixture<SelectPenaltySeveritiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectPenaltySeveritiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectPenaltySeveritiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
