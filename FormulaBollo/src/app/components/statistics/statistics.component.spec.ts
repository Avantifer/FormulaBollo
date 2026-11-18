import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { StatisticsComponent } from './statistics.component';

describe('StatisticsComponent', () => {
  let component: StatisticsComponent;
  let fixture: ComponentFixture<StatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps exactly one Spanish h1 across all tabs', () => {
    for (const button of fixture.nativeElement.querySelectorAll('p-button button')) {
      button.click();
      fixture.detectChanges();
      const headings = fixture.nativeElement.querySelectorAll('h1');
      expect(headings.length).withContext(button.textContent).toBe(1);
      expect(headings[0].textContent.trim()).toBe('Estadísticas');
    }
  });
});
