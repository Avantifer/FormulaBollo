import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Top3DriversComponent } from './top3-drivers.component';

describe('Top3DriversComponent', () => {
  let component: Top3DriversComponent;
  let fixture: ComponentFixture<Top3DriversComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      declarations: [ Top3DriversComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Top3DriversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
