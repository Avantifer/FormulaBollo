import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { HomeTeamsComponent } from './home-teams.component';

describe('HomeTeamsComponent', () => {
  let component: HomeTeamsComponent;
  let fixture: ComponentFixture<HomeTeamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeTeamsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(HomeTeamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
