import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { SeasonApiService } from '../../services/api/season-api.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { Season } from '../../models/season';
import { ERROR_DRIVER_NAME_NOT_FOUND, ERROR_TEAM_NAME_NOT_FOUND } from '../../../app/constants';
import { SelectSeasonsComponent } from './select-seasons.component';

describe('SelectSeasonsComponent', () => {
  const first = new Season(42, 'Primera', 2);
  const last = new Season(43, 'Última', 3);
  let api: jasmine.SpyObj<SeasonApiService>;
  let fixture: ComponentFixture<SelectSeasonsComponent>;
  let component: SelectSeasonsComponent;
  let emit: jasmine.Spy;

  beforeEach(() => {
    api = jasmine.createSpyObj('SeasonApiService', [
      'getSeasons', 'getSeasonOfFantasy', 'getSeasonByDriverName', 'getSeasonByTeamName'
    ]);
    for (const method of [api.getSeasons, api.getSeasonOfFantasy, api.getSeasonByDriverName, api.getSeasonByTeamName]) {
      method.and.returnValue(of([first, last]));
    }
    TestBed.configureTestingModule({
      imports: [SelectSeasonsComponent],
      providers: [...provideComponentTesting(), { provide: SeasonApiService, useValue: api }]
    });
    fixture = TestBed.createComponent(SelectSeasonsComponent);
    component = fixture.componentInstance;
    emit = spyOn(component.seasonChanged, 'emit');
  });

  afterEach(() => fixture.destroy());

  it('renders accessible season buttons with Total initially pressed in tabs mode', () => {
    fixture.componentRef.setInput('driverName', 'Piloto');
    fixture.componentRef.setInput('variant', 'tabs');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-select')).toBeNull();
    const group = fixture.nativeElement.querySelector('[role="group"]');
    expect(group.getAttribute('aria-label')).toBe('Temporadas');
    const buttons = group.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(buttons, button => button.textContent!.trim())).toEqual(['Total', 'T2 (Temporada 2)', 'T3 (Temporada 3)']);
    for (const button of Array.from(buttons)) {
      expect(button.hasAttribute('aria-label')).toBeFalse();
      const visible = button.cloneNode(true) as HTMLElement;
      visible.querySelectorAll('.sr-only').forEach(span => span.remove());
      expect(button.textContent).toContain(visible.textContent!.trim());
    }
    expect(buttons[0].querySelector('.sr-only')).toBeNull();
    expect(buttons[1].querySelector('.sr-only')?.textContent).toBe(' (Temporada 2)');
    expect(Array.from(buttons, button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    expect(Array.from(buttons, button => getComputedStyle(button).cursor)).toEqual(['pointer', 'pointer', 'pointer']);
    expect(buttons[0].classList.contains('bg-accent')).toBeTrue();
    expect(buttons[0].classList.contains('text-on-accent')).toBeTrue();
    emit.calls.reset();
    buttons[1].click();
    fixture.detectChanges();
    expect(emit).toHaveBeenCalledOnceWith(first);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].type).toBe('button');
  });

  it('honors initialSeasonNumber for tabs and lets the user return to Total', () => {
    fixture.componentRef.setInput('driverName', 'Piloto');
    fixture.componentRef.setInput('variant', 'tabs');
    fixture.componentRef.setInput('initialSeasonNumber', last.number);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
    expect(emit).toHaveBeenCalledOnceWith(last);
    emit.calls.reset();
    buttons[0].click();
    fixture.detectChanges();
    expect(emit).toHaveBeenCalledOnceWith(component.seasons()[0]);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('renders general season tabs without Total and emits the clicked season once', () => {
    fixture.componentRef.setInput('variant', 'tabs');
    fixture.componentRef.setInput('initialSeasonNumber', first.number);
    fixture.detectChanges();
    expect(component.seasons()).toEqual([first, last]);
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(buttons, button => button.textContent!.trim())).toEqual(['T2 (Temporada 2)', 'T3 (Temporada 3)']);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(emit).toHaveBeenCalledOnceWith(first);
    emit.calls.reset();
    buttons[1].click();
    fixture.detectChanges();
    expect(emit).toHaveBeenCalledOnceWith(last);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps the select alias identical to the default select', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('p-select') as HTMLElement;
    const before = getComputedStyle(select);
    const appearance = [before.borderRadius, before.minHeight, before.backgroundColor, before.color];
    fixture.componentRef.setInput('variant', 'select');
    fixture.detectChanges();
    await fixture.whenStable();
    const after = getComputedStyle(select);
    expect([after.borderRadius, after.minHeight, after.backgroundColor, after.color]).toEqual(appearance);
    expect(fixture.nativeElement.querySelectorAll('p-select').length).toBe(1);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('opts into row corners while preserving pill dimensions, chevron and the default appearance', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('p-select') as HTMLElement;
    const defaultRadius = getComputedStyle(select).borderRadius;
    const defaultHeight = getComputedStyle(select).minHeight;
    expect(component.variant()).toBe('default');

    fixture.componentRef.setInput('variant', 'pill');
    fixture.detectChanges();
    await fixture.whenStable();
    const pill = select.getBoundingClientRect();
    expect(parseFloat(getComputedStyle(select).borderRadius)).toBeGreaterThanOrEqual(100);

    fixture.componentRef.setInput('variant', 'row');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(getComputedStyle(select).borderRadius).toBe('4px');
    expect(select.getBoundingClientRect().height).toBe(pill.height);
    expect(select.getBoundingClientRect().width).toBe(pill.width);
    expect(getComputedStyle(select).minHeight).toBe('44px');
    expect(select.querySelector('.p-select-dropdown')).not.toBeNull();

    fixture.componentRef.setInput('variant', 'default');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(getComputedStyle(select).borderRadius).toBe(defaultRadius);
    expect(getComputedStyle(select).minHeight).toBe(defaultHeight);
  });

  it('selects the latest season and emits a user selection once', () => {
    fixture.detectChanges();
    expect(api.getSeasons).toHaveBeenCalledTimes(1);
    expect(component.seasons()).toEqual([first, last]);
    expect(emit).toHaveBeenCalledOnceWith(last);
    emit.calls.reset();
    component.seasonForm.get('season')!.setValue(first);
    expect(emit).toHaveBeenCalledOnceWith(first);
  });

  it('loads only Fantasy seasons when requested', () => {
    fixture.componentRef.setInput('fantasy', true);
    fixture.detectChanges();
    expect(api.getSeasonOfFantasy).toHaveBeenCalledTimes(1);
    expect(api.getSeasons).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledOnceWith(last);
  });

  it('accepts an initial season by number rather than id and emits it once', () => {
    fixture.componentRef.setInput('initialSeasonNumber', first.number);
    fixture.detectChanges();
    expect(component.seasonForm.get('season')!.value).toEqual(first);
    expect(emit).toHaveBeenCalledOnceWith(first);
  });

  for (const number of [999, -1, NaN, 2.5]) {
    it('ignores an unavailable initial season ' + number, () => {
      fixture.componentRef.setInput('initialSeasonNumber', number);
      fixture.detectChanges();
      expect(component.seasonForm.get('season')!.value).toEqual(last);
      expect(emit).toHaveBeenCalledOnceWith(last);
    });
  }

  it('validates the initial season after an asynchronous season response', () => {
    const response = new Subject<Season[]>();
    api.getSeasons.and.returnValue(response);
    fixture.componentRef.setInput('initialSeasonNumber', first.number);
    fixture.detectChanges();
    expect(emit).not.toHaveBeenCalled();
    response.next([first, last]);
    expect(component.seasonForm.get('season')!.value).toEqual(first);
    expect(emit).toHaveBeenCalledOnceWith(first);
  });

  for (const entity of ['driver', 'team'] as const) {
    it(`loads ${entity} seasons and prepends Total`, () => {
      fixture.componentRef.setInput(`${entity}Name`, 'Nombre de prueba');
      fixture.detectChanges();
      const request = entity === 'driver' ? api.getSeasonByDriverName : api.getSeasonByTeamName;
      expect(request).toHaveBeenCalledOnceWith('Nombre de prueba');
      expect(component.seasons().map(season => season.number)).toEqual([0, 2, 3]);
      expect(emit).toHaveBeenCalledOnceWith(component.seasons()[0]);
    });

    it(`redirects and warns when ${entity} has no seasons`, () => {
      const request = entity === 'driver' ? api.getSeasonByDriverName : api.getSeasonByTeamName;
      request.and.returnValue(of([]));
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
      fixture.componentRef.setInput(`${entity}Name`, 'Ausente');
      fixture.detectChanges();
      expect(navigate).toHaveBeenCalledOnceWith([entity === 'driver' ? '/drivers' : '/teams']);
      expect(notify).toHaveBeenCalledOnceWith(entity === 'driver' ? ERROR_DRIVER_NAME_NOT_FOUND : ERROR_TEAM_NAME_NOT_FOUND, '');
    });
  }

  it('includes Total for general statistics', () => {
    fixture.componentRef.setInput('statistics', 'general');
    fixture.detectChanges();
    expect(component.seasons().map(season => season.name)).toEqual(['Total', 'Primera', 'Última']);
    expect(emit).toHaveBeenCalledOnceWith(component.seasons()[0]);
  });

  it('clears a general empty selection without emitting a season', () => {
    api.getSeasons.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component.seasons()).toEqual([]);
    expect(component.seasonForm.get('season')!.value).toBeNull();
    expect(emit).not.toHaveBeenCalled();
  });

  it('reports a load error without emitting and recovers when the input changes', () => {
    const error = new Error('offline');
    api.getSeasons.and.returnValue(throwError(() => error));
    const notify = spyOn(TestBed.inject(MessageInfoService), 'showError');
    fixture.detectChanges();
    expect(notify).toHaveBeenCalledOnceWith('No se pudieron cargar las temporadas', error);
    expect(emit).not.toHaveBeenCalled();
    fixture.componentRef.setInput('fantasy', true);
    fixture.detectChanges();
    expect(component.seasons()).toEqual([first, last]);
    expect(emit).toHaveBeenCalledOnceWith(last);
  });
});
