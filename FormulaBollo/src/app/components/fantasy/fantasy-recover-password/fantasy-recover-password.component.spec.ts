import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FantasyRecoverPasswordComponent } from './fantasy-recover-password.component';

describe('FantasyRecoverPasswordComponent', () => {
  let component: FantasyRecoverPasswordComponent;
  let fixture: ComponentFixture<FantasyRecoverPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyRecoverPasswordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FantasyRecoverPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
