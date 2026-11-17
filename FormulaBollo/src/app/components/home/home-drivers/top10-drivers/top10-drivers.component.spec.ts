import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting, driverPointsFixture } from '../../../../../testing/component-test-providers';
import { By } from '@angular/platform-browser';
import { Top10DriversComponent } from './top10-drivers.component';

describe('Top10DriversComponent', () => {
  let component: Top10DriversComponent;
  let fixture: ComponentFixture<Top10DriversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top10DriversComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(Top10DriversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a focusable driver link without custom navigation handlers or nested controls', () => {
    fixture.componentRef.setInput('top10', [driverPointsFixture]);
    fixture.detectChanges();

    const link = fixture.debugElement.query(By.css('.drivers-top10-container'));
    const element: HTMLAnchorElement = link.nativeElement;
    expect(element.tagName).toBe('A');
    expect(element.getAttribute('href')).toBe('/drivers/Piloto_de_prueba');
    expect(element.tabIndex).toBe(0);
    expect(element.classList.contains('flex')).toBeTrue();
    expect(element.querySelector('a, button')).toBeNull();
    // RouterLink supplies the only click listener; navigation has no template handlers.
    expect(link.listeners.filter(listener => listener.name === 'click').length).toBe(1);
    expect(link.listeners.some(listener => listener.name.startsWith('keydown'))).toBeFalse();
  });

  it('renders every row as a link without headings', () => {
    fixture.componentRef.setInput('top10', [driverPointsFixture, {
      ...driverPointsFixture,
      driver: { ...driverPointsFixture.driver, id: 2, name: 'Segundo piloto' },
    }]);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.drivers-top10-container');
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(row.matches('a[href]')).toBeTrue();
      expect(row.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
    }
  });
});
