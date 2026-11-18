import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { FormulaBolloPreset } from '../../../app.config';
import { provideComponentTesting, teamPointsFixture } from '../../../../testing/component-test-providers';
import { TeamCardComponent } from './team-card.component';

describe('TeamCardComponent', () => {
  let component: TeamCardComponent;
  let fixture: ComponentFixture<TeamCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamCardComponent],
      providers: [
        ...provideComponentTesting(),
        providePrimeNG({ theme: { preset: FormulaBolloPreset } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('teamPoints', teamPointsFixture);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders progress bars with a computed height of 6px', async () => {
    await fixture.whenStable();
    const bars: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.p-progressbar');
    expect(bars.length).toBe(2);
    bars.forEach(bar => {
      const height = parseFloat(getComputedStyle(bar).height);
      expect(Math.abs(height - 6)).toBeLessThanOrEqual(0.5);
    });
  });

  it('names each driver progress bar and omits aria-level', () => {
    const bars: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('p-progressbar');
    const drivers = [teamPointsFixture.driver1, teamPointsFixture.driver2];
    expect(bars.length).toBe(2);
    bars.forEach((bar, index) => {
      expect(bar.getAttribute('aria-label')).toBe(`Puntos de ${drivers[index].driver.name}`);
      expect(bar.hasAttribute('aria-level')).toBeFalse();
    });
  });

  it('keeps progress bars accessible when driver names and points change', () => {
    const drivers = [teamPointsFixture.driver1, teamPointsFixture.driver2].map((driver, index) => ({
      ...driver,
      driver: { ...driver.driver, name: `Piloto actualizado ${index + 1}` },
      totalPoints: (index + 1) * 10,
    }));
    fixture.componentRef.setInput('teamPoints', {
      ...teamPointsFixture,
      driver1: drivers[0],
      driver2: drivers[1],
    });
    fixture.detectChanges();
    const bars: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('p-progressbar');
    expect(bars.length).toBe(2);
    bars.forEach((bar, index) => {
      expect(bar.getAttribute('aria-label')).toBe(`Puntos de ${drivers[index].driver.name}`);
      expect(bar.hasAttribute('aria-level')).toBeFalse();
    });
  });

  for (const [name, href] of [['Red Bull', '/teams/Red_Bull'], ['McLaren', '/teams/McLaren']]) {
    it(`renders ${name} as a focusable native link to ${href}`, () => {
      fixture.componentRef.setInput('teamPoints', {
        ...teamPointsFixture,
        team: { ...teamPointsFixture.team, name },
      });
      fixture.detectChanges();
      const root = fixture.nativeElement.firstElementChild as HTMLAnchorElement;
      expect(root.tagName).toBe('A');
      expect(root.getAttribute('href')).toBe(href);
      expect(root.tabIndex).toBe(0);
      expect(root.querySelector('a, button')).toBeNull();
    });
  }

  it('uses RouterLink without a custom click or Enter handler on the root', () => {
    const root = fixture.debugElement.children[0];
    expect(root.query(By.css('a, button'))).toBeNull();
    expect(root.injector.get(RouterLink, null)).not.toBeNull();
    // RouterLink supplies its own click listener; the template must not add another.
    expect(root.listeners.filter(listener => listener.name === 'click').length).toBe(1);
    expect(root.listeners.some(listener => listener.name === 'keydown.enter')).toBeFalse();
  });
});
