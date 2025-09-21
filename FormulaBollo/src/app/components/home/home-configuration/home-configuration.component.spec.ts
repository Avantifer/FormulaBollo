import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeConfigurationComponent } from './home-configuration.component';

describe('HomeConfigurationComponent', () => {
  let component: HomeConfigurationComponent;
  let fixture: ComponentFixture<HomeConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeConfigurationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
