import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriversInfoComponent } from './drivers-info.component';

describe('DriversInfoComponent', () => {
  let component: DriversInfoComponent;
  let fixture: ComponentFixture<DriversInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriversInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriversInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
