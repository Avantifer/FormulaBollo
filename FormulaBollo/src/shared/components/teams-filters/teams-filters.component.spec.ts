import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { provideComponentTesting, driverPointsFixture } from '../../../testing/component-test-providers';
import { TeamApiService } from '../../services/api/team-api.service';
import { ImageService } from '../../services/image.service';
import { TeamsFiltersComponent } from './teams-filters.component';

describe('TeamsFiltersComponent', () => {
  let fixture: ComponentFixture<TeamsFiltersComponent>;
  const ferrari = driverPointsFixture.driver.team;
  const alpine = { ...ferrari, id: 2, name: 'Alpine', logoImage: 'alpine.webp' };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TeamsFiltersComponent], providers: provideComponentTesting() });
    spyOn(TestBed.inject(TeamApiService), 'getAllTeams').and.returnValue(of([ferrari, alpine]));
    fixture = TestBed.createComponent(TeamsFiltersComponent);
  });

  afterEach(() => fixture.destroy());

  function logo(name: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[aria-label="' + name + '"]');
  }

  function click(name: string) { logo(name).click(); fixture.detectChanges(); }

  it('shows logos with full team images, labels and default Todos selection', () => {
    const image = spyOn(TestBed.inject(ImageService), 'getImageUrl').and.callThrough();
    fixture.componentRef.setInput('variant', 'logos');
    fixture.detectChanges();
    expect(logo('Todos los equipos').getAttribute('aria-pressed')).toBe('true');
    expect(logo('Ferrari').getAttribute('aria-pressed')).toBe('false');
    expect(logo('Alpine').querySelector('img')?.alt).toBe('');
    expect(image).toHaveBeenCalledWith('alpine.webp');
    expect(fixture.nativeElement.querySelector('p-chip')).toBeNull();
  });

  it('supports multiple teams, deselection, return to Todos and clearing all', () => {
    const emit = spyOn(fixture.componentInstance.selectedTeamsChanged, 'emit');
    fixture.componentRef.setInput('variant', 'logos');
    fixture.detectChanges();
    click('Ferrari');
    click('Alpine');
    expect(emit).toHaveBeenCalledWith(['Ferrari', 'Alpine']);
    expect(logo('Ferrari').getAttribute('aria-pressed')).toBe('true');
    expect(logo('Alpine').getAttribute('aria-pressed')).toBe('true');
    expect(logo('Todos los equipos').getAttribute('aria-pressed')).toBe('false');
    click('Ferrari');
    expect(emit).toHaveBeenCalledWith(['Alpine']);
    expect(logo('Ferrari').getAttribute('aria-pressed')).toBe('false');
    click('Alpine');
    expect(emit).toHaveBeenCalledWith(['Todos los equipos']);
    expect(logo('Todos los equipos').getAttribute('aria-pressed')).toBe('true');
    click('Alpine');
    click('Ferrari');
    click('Todos los equipos');
    expect(logo('Ferrari').getAttribute('aria-pressed')).toBe('false');
    expect(logo('Alpine').getAttribute('aria-pressed')).toBe('false');
    expect(emit.calls.mostRecent().args[0]).toEqual(['Todos los equipos']);
  });

  it('keeps 44px logo badges with a 1px border in both themes and preserves selected team color', () => {
    fixture.componentRef.setInput('variant', 'logos');
    fixture.detectChanges();
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    try {
      for (const dark of [false, true]) {
        root.classList.toggle('dark', dark);
        click('Todos los equipos');
        const badge = logo('Ferrari');
        const style = getComputedStyle(badge);
        expect(style.backgroundColor).toBe('rgb(233, 236, 239)');
        expect(style.borderTopWidth).toBe('1px');
        expect(style.borderTopColor).toBe(dark ? 'rgb(47, 53, 61)' : 'rgb(222, 225, 229)');
        expect(badge.getBoundingClientRect().width).toBe(44);
        expect(badge.getBoundingClientRect().height).toBe(44);
        click('Ferrari');
        expect(getComputedStyle(badge).borderTopColor).toBe(getComputedStyle(badge).color);
      }
    } finally { root.classList.toggle('dark', wasDark); }
  });

  it('resets selection and requests full teams when the season changes', () => {
    const emit = spyOn(fixture.componentInstance.selectedTeamsChanged, 'emit');
    fixture.componentRef.setInput('variant', 'logos');
    fixture.detectChanges();
    click('Alpine');
    fixture.componentRef.setInput('season', { ...ferrari.season, number: 2 });
    fixture.detectChanges();
    expect(TestBed.inject(TeamApiService).getAllTeams).toHaveBeenCalledWith(2);
    expect(emit.calls.mostRecent().args[0]).toEqual(['Todos los equipos']);
    expect(logo('Todos los equipos').getAttribute('aria-pressed')).toBe('true');
  });

  it('applies only valid initial teams, deduplicates and clears them on season change', () => {
    const emit = spyOn(fixture.componentInstance.selectedTeamsChanged, 'emit');
    fixture.componentRef.setInput('variant', 'logos');
    fixture.componentRef.setInput('initialSelectedTeams', ['Alpine', 'Ausente', 'Alpine']);
    fixture.detectChanges();
    expect(emit).toHaveBeenCalledOnceWith(['Alpine']);
    expect(logo('Alpine').getAttribute('aria-pressed')).toBe('true');
    expect(logo('Todos los equipos').getAttribute('aria-pressed')).toBe('false');
    fixture.componentRef.setInput('season', { ...ferrari.season, number: 2 });
    fixture.detectChanges();
    expect(emit.calls.mostRecent().args[0]).toEqual(['Todos los equipos']);
    expect(logo('Alpine').getAttribute('aria-pressed')).toBe('false');
  });

  it('ignores initial teams absent from the requested season', () => {
    const emit = spyOn(fixture.componentInstance.selectedTeamsChanged, 'emit');
    fixture.componentRef.setInput('variant', 'logos');
    fixture.componentRef.setInput('initialSelectedTeams', ['Ausente']);
    fixture.detectChanges();
    expect(emit).toHaveBeenCalledOnceWith(['Todos los equipos']);
    expect(logo('Todos los equipos').getAttribute('aria-pressed')).toBe('true');
  });

  it('waits for teams to validate initial selection and cancels obsolete loads', () => {
    const response = new Subject<typeof ferrari[]>();
    (TestBed.inject(TeamApiService).getAllTeams as jasmine.Spy).and.returnValue(response);
    const emit = spyOn(fixture.componentInstance.selectedTeamsChanged, 'emit');
    fixture.componentRef.setInput('variant', 'logos');
    fixture.componentRef.setInput('initialSelectedTeams', ['Alpine']);
    fixture.detectChanges();
    expect(emit).not.toHaveBeenCalled();
    response.next([ferrari, alpine]);
    fixture.detectChanges();
    expect(emit).toHaveBeenCalledOnceWith(['Alpine']);
    (TestBed.inject(TeamApiService).getAllTeams as jasmine.Spy).and.returnValue(of([ferrari]));
    fixture.componentRef.setInput('season', { ...ferrari.season, number: 2 });
    fixture.detectChanges();
    response.next([alpine]);
    fixture.detectChanges();
    expect(logo('Alpine')).toBeNull();
    expect(emit.calls.mostRecent().args[0]).toEqual(['Todos los equipos']);
  });

  it('keeps chips hidden by default and preserves additive selection and remove buttons', () => {
    const emit = spyOn(fixture.componentInstance.selectedTeamsChanged, 'emit');
    fixture.detectChanges();
    expect(fixture.componentInstance.variant()).toBe('chips');
    expect(fixture.nativeElement.querySelector('p-chip')).toBeNull();
    fixture.componentRef.setInput('showFilters', true);
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll('p-chip') as NodeListOf<HTMLElement>;
    expect(chips.length).toBe(3);
    expect(chips[0].textContent).toContain('Todos los equipos');
    chips[1].click();
    fixture.detectChanges();
    chips[1].click();
    fixture.detectChanges();
    expect(emit.calls.mostRecent().args[0]).toEqual(['Ferrari']);
    chips[2].click();
    fixture.detectChanges();
    chips[0].click();
    expect(emit.calls.mostRecent().args[0]).toEqual(['Ferrari', 'Alpine']);
    chips[1].querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(emit.calls.mostRecent().args[0]).toEqual(['Alpine']);
    chips[2].querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(emit.calls.mostRecent().args[0]).toEqual(['Todos los equipos']);
  });
});
