import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { TeamsFiltersComponent } from './teams-filters.component';

describe('TeamsFiltersComponent', () => {
  let component: TeamsFiltersComponent;
  let fixture: ComponentFixture<TeamsFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamsFiltersComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
