import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { DriversGridTableComponent } from './drivers-teams-grid-table.component';

describe('DriversGridTableComponent', () => {
  let component: DriversGridTableComponent;
  let fixture: ComponentFixture<DriversGridTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriversGridTableComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(DriversGridTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('type', 'Pilotos');
    fixture.componentRef.setInput('listValue', 'list');
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
