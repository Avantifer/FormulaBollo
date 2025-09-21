import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FantasyClasificationComponent } from './fantasy-clasification.component';

describe('FantasyClasificationComponent', () => {
  let component: FantasyClasificationComponent;
  let fixture: ComponentFixture<FantasyClasificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyClasificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FantasyClasificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
