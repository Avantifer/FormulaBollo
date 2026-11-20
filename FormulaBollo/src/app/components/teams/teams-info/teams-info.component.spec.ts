import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting, teamPointsFixture } from '../../../../testing/component-test-providers';
import { TeamInfo } from '../../../../shared/models/teamInfo';
import { TeamsInfoComponent } from './teams-info.component';

describe('TeamsInfoComponent', () => {
  let component: TeamsInfoComponent;
  let fixture: ComponentFixture<TeamsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamsInfoComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('formats the average position with a comma while preserving integer statistics', () => {
    const info: TeamInfo = {
      team: teamPointsFixture.team,
      poles: 1, fastlaps: 2, racesFinished: 3, totalPoints: 12345,
      constructors: 0, penalties: 0, bestPosition: 1,
      podiums: 4, victories: 2, averagePosition: 7.34, last5Results: []
    };
    component['teamInfo'].set(info);
    component['_mapTeamStats'](info);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('7,34');
    expect(fixture.nativeElement.textContent).toContain('12345');
    expect(component['teamStatsArray']().find(stat => stat.key === 'Puntos Totales')?.value).toBe(12345);
  });

  it('renders one h1 before loading and replaces it with the team name', () => {
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    component['teamInfo'].set({
      team: teamPointsFixture.team,
      poles: 0, fastlaps: 0, racesFinished: 0, totalPoints: 0,
      constructors: 0, penalties: 0, bestPosition: 0,
      podiums: 0, victories: 0, averagePosition: 0,
      last5Results: [],
    } satisfies TeamInfo);
    fixture.detectChanges();

    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent.trim()).toBe(teamPointsFixture.team.name);
    expect(headings[0].classList.contains('sr-only')).toBeFalse();
  });

  it('renders a timing tower with team borders, points and accented status labels, and links driver cards', () => {
    const race = {
      id: 1, name: 'Carrera de prueba', flagImage: 'flag.png', circuitImage: 'circuit.png',
      dateStart: new Date('2026-01-01'), season: teamPointsFixture.team.season, finished: 1,
    };
    const drivers = [teamPointsFixture.driver1, teamPointsFixture.driver2];
    component['teamInfo'].set({
      team: teamPointsFixture.team,
      poles: 0, fastlaps: 0, racesFinished: 0, totalPoints: 0,
      constructors: 0, penalties: 0, bestPosition: 0,
      podiums: 0, victories: 0, averagePosition: 0,
      last5Results: [1, 0].map(hasFastLap => ({
        id: hasFastLap + 1, race, totalPoints: 43, hasFastLap, hasPole: 1 - hasFastLap,
        results: drivers.map((driverPoint, index) => ({
          race, driver: driverPoint.driver,
          position: { id: index + 1, positionNumber: index + (hasFastLap === 1 ? 1 : 2), points: driverPoint.totalPoints },
          fastlap: hasFastLap, pole: 1 - hasFastLap,
        })),
      })) as unknown as TeamInfo['last5Results'],
    });
    component['drivers'].set(drivers);
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('p-table') as HTMLElement;
    expect(table).not.toBeNull();
    expect(table.classList.contains('timing-tower')).toBeTrue();
    expect(table.querySelectorAll('thead th.tt-points').length).toBe(1);
    expect(table.querySelectorAll('thead th.tt-actions').length).toBe(1);
    const rows = table.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(rows.length).toBe(2);
    rows.forEach((row, index) => {
      expect(row.cells[0].classList.contains('border-Ferrari')).toBeTrue();
      expect(row.querySelectorAll('td.tt-points').length).toBe(1);
      expect(row.querySelector('td.tt-points')?.textContent?.trim()).toBe('+43');
      expect(row.cells[1].textContent?.trim()).toBe(index === 0 ? 'Sí' : 'No');
      expect(row.cells[2].textContent?.trim()).toBe(index === 0 ? 'No' : 'Sí');
    });

    const cards = fixture.nativeElement.querySelectorAll('a[href^="/drivers/"]') as NodeListOf<HTMLAnchorElement>;
    expect(cards.length).toBe(drivers.length);
    cards.forEach((card, index) => {
      expect(card.tagName).toBe('A');
      expect(card.getAttribute('href')).toBe('/drivers/' + drivers[index].driver.name.replaceAll(' ', '_'));
      expect(card.querySelector('img')?.getAttribute('alt')).toBe(drivers[index].driver.name);
    });
  });
});
