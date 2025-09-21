import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamsCardComponent } from './team-card.component';

describe('TeamCardComponent', () => {
  let component: TeamsCardComponent;
  let fixture: ComponentFixture<TeamsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamsCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
