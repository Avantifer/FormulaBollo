import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting, driverPointsFixture } from '../../../../testing/component-test-providers';
import { By } from '@angular/platform-browser';
import { RecordsComponent } from './records.component';

describe('RecordsComponent', () => {
  let component: RecordsComponent;
  let fixture: ComponentFixture<RecordsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordsComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(RecordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marks every record trophy as a best result and preserves driver and team hrefs', () => {
    const driver = driverPointsFixture.driver;
    TestBed.inject(HttpTestingController).expectOne(request => request.url.endsWith('/recordsDrivers')).flush([
      { title: 'Victorias', value: 1, driver, team: driver.team, season: driver.season },
      { title: 'Podios', value: 2, driver, team: driver.team, season: driver.season },
    ]);
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('.grid > div'));
    expect(cards.length).toBe(2);
    for (const card of cards) {
      const trophy = card.query(By.css('.pi-trophy'));
      expect(trophy.nativeElement.classList.contains('text-sector-best')).toBeTrue();
      const links = card.queryAll(By.css('p a'));
      expect(links.length).toBe(2);
      expect(links.every(link => link.nativeElement.tagName === 'A')).toBeTrue();
      expect(links.map(link => link.nativeElement.getAttribute('href'))).toEqual([
        '/drivers/Piloto_de_prueba', '/teams/Ferrari',
      ]);
    }
  });

  it('renders focusable driver and team links without custom navigation handlers', () => {
    const driver = driverPointsFixture.driver;
    TestBed.inject(HttpTestingController).expectOne(request => request.url.endsWith('/recordsDrivers')).flush([
      { title: 'Victorias', value: 1, driver, team: driver.team, season: driver.season },
    ]);
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('p a'));
    expect(links.length).toBe(2);
    expect(links.map(link => link.nativeElement.getAttribute('href'))).toEqual([
      '/drivers/Piloto_de_prueba', '/teams/Ferrari',
    ]);
    for (const link of links) {
      expect(link.nativeElement.tagName).toBe('A');
      expect(link.nativeElement.tabIndex).toBe(0);
      expect(link.listeners.filter(listener => listener.name === 'click').length).toBe(1);
      expect(link.listeners.some(listener => listener.name.startsWith('keydown'))).toBeFalse();
    }
  });
});
