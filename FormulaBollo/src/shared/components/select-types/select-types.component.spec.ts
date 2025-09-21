import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectTypeComponent } from './select-types.component';

describe('SelectTypeComponent', () => {
  let component: SelectTypeComponent;
  let fixture: ComponentFixture<SelectTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
