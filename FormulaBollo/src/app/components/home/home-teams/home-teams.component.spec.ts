import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeTeamsComponent } from './home-teams.component';

describe('HomeTeamsComponent', () => {
  let component: HomeTeamsComponent;
  let fixture: ComponentFixture<HomeTeamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeTeamsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeTeamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
