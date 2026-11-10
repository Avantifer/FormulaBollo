import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { SelectPenaltySeveritiesComponent } from './select-penalty-severities.component';

describe('SelectPenaltySeveritiesComponent', () => {
  let component: SelectPenaltySeveritiesComponent;
  let fixture: ComponentFixture<SelectPenaltySeveritiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectPenaltySeveritiesComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(SelectPenaltySeveritiesComponent);
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
