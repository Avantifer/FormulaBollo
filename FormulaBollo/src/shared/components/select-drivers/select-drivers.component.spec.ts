import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectDriversComponent } from './select-drivers.component';

describe('SelectDriversComponent', () => {
  let component: SelectDriversComponent;
  let fixture: ComponentFixture<SelectDriversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectDriversComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectDriversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
