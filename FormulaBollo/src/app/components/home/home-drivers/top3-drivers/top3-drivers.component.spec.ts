import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../../testing/component-test-providers';
import { Top3DriversComponent } from './top3-drivers.component';

describe('Top3DriversComponent', () => {
  let component: Top3DriversComponent;
  let fixture: ComponentFixture<Top3DriversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top3DriversComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(Top3DriversComponent);
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
