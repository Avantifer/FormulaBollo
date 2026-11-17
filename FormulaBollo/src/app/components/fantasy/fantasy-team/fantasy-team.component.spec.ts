import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { FantasyTeamComponent } from './fantasy-team.component';

describe('FantasyTeamComponent', () => {
  let component: FantasyTeamComponent;
  let fixture: ComponentFixture<FantasyTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyTeamComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(FantasyTeamComponent);
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
