import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FantasyRegisterComponent } from './fantasy-register.component';

describe('FantasyRegisterComponent', () => {
  let component: FantasyRegisterComponent;
  let fixture: ComponentFixture<FantasyRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyRegisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FantasyRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
