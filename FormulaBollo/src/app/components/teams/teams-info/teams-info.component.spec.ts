import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
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
});
