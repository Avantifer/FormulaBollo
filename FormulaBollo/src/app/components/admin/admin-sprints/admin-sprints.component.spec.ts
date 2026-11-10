import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { AdminSprintsComponent } from './admin-sprints.component';

describe('AdminSprintsComponent', () => {
  let component: AdminSprintsComponent;
  let fixture: ComponentFixture<AdminSprintsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSprintsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSprintsComponent);
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
