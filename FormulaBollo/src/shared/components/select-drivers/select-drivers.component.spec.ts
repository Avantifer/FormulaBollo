import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { SelectDriversComponent } from './select-drivers.component';

describe('SelectDriversComponent', () => {
  let component: SelectDriversComponent;
  let fixture: ComponentFixture<SelectDriversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectDriversComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(SelectDriversComponent);
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
