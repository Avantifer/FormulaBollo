import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { GeneralStatsComponent } from './general-stats.component';

describe('GeneralStatsComponent', () => {
  let component: GeneralStatsComponent;
  let fixture: ComponentFixture<GeneralStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralStatsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(GeneralStatsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('typeSelected', 'Pilotos');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
