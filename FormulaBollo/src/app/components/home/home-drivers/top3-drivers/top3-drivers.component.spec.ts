import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting, driverPointsFixture } from '../../../../../testing/component-test-providers';
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

  it('keeps the expected text color on all three position badges', () => {
    fixture.componentRef.setInput('top3', [driverPointsFixture, driverPointsFixture, driverPointsFixture]);
    fixture.detectChanges();

    const badges: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.rounded-l-lg'));
    expect(badges.length).toBe(3);
    badges.forEach((badge, index) => {
      expect(badge.textContent?.trim()).toBe(['2º', '1º', '3º'][index]);
      expect(badge.classList.contains('text-slate-900')).withContext(`badge ${index}`).toBe(index !== 2);
      expect(badge.classList.contains('text-white')).withContext(`badge ${index}`).toBe(index === 2);
    });
  });
});
