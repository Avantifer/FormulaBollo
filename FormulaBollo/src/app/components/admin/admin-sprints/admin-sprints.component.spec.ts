import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSprintsComponent } from './admin-sprints.component';

describe('AdminSprintsComponent', () => {
  let component: AdminSprintsComponent;
  let fixture: ComponentFixture<AdminSprintsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSprintsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminSprintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
