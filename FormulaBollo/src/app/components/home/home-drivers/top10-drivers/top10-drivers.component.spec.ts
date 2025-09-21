import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Top10DriversComponent } from './top10-drivers.component';

describe('Top10DriversComponent', () => {
  let component: Top10DriversComponent;
  let fixture: ComponentFixture<Top10DriversComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      declarations: [ Top10DriversComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Top10DriversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
