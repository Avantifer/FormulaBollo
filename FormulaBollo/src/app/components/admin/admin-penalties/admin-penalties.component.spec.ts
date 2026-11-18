import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { driverPointsFixture, provideComponentTesting } from '../../../../testing/component-test-providers';
import { Penalty } from '../../../../shared/models/penalty';
import { Race } from '../../../../shared/models/race';
import { AdminPenaltiesComponent } from './admin-penalties.component';

describe('AdminPenaltiesComponent', () => {
  let component: AdminPenaltiesComponent;
  let fixture: ComponentFixture<AdminPenaltiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPenaltiesComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPenaltiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders loaded penalties in a timing tower with team borders and severity chips', async () => {
    const driver = driverPointsFixture.driver;
    const race = new Race(11, 'Carrera A', '', '', new Date('2026-05-01'), driver.season, 1);
    const severities = ['Aviso', 'Leve', 'Grave'];
    const colors = ['text-fantasy-text', 'text-warn', 'text-sector-down'];
    const penalties = severities.map((severity, index) =>
      new Penalty(index + 1, race, driver, `Motivo ${index + 1}`, { id: index + 1, severity }, driver.season));
    TestBed.inject(HttpTestingController)
      .expectOne(request => request.url.endsWith('/penalties/totalPerDriver')).flush(penalties);
    await fixture.whenStable();
    fixture.detectChanges();

    const tower: HTMLElement = fixture.nativeElement.querySelector('p-table.penaltiesTable.timing-tower');
    expect(tower).not.toBeNull();
    const rows = tower.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      expect(cells[0].classList).toContain('border-Ferrari');
      expect(cells[0].textContent).toContain(driver.name);
      expect(cells[1].textContent).toContain(race.name);
      const chip = cells[2].querySelector('span')!;
      expect(chip.textContent!.trim()).toBe(severities[index]);
      for (const className of ['bg-panel-alt', 'border', 'border-rule', colors[index]]) {
        expect(chip.classList).toContain(className);
      }
      expect(cells[3].textContent).toContain(penalties[index].reason);
    });
  });
});
