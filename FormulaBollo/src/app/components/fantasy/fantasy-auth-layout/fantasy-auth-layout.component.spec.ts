import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../../testing/component-test-providers';
import { FantasyAuthLayoutComponent } from './fantasy-auth-layout.component';
import { fantasyFixture } from '../fantasy-clasification/fantasy-clasification.fixture';

describe('FantasyAuthLayoutComponent', () => {
  let fixture: ComponentFixture<FantasyAuthLayoutComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FantasyAuthLayoutComponent], providers: provideComponentTesting() });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FantasyAuthLayoutComponent);
    fixture.detectChanges();
  });

  afterEach(() => { fixture.destroy(); http.verify({ ignoreCancelled: true }); });

  it('loads the latest Fantasy season and displays the total podium and participation summary', () => {
    http.expectOne(req => req.url.endsWith('/seasons/fantasy')).flush([{ number: 1 }, { number: 3 }, { number: 2 }]);
    const request = http.expectOne(req => req.url.endsWith('/fantasy/clasification'));
    expect(request.request.params.get('numberSeason')).toBe('3');
    request.flush(fantasyFixture()); fixture.detectChanges();
    const rows = Array.from(fixture.nativeElement.querySelectorAll('.podium li') as NodeListOf<HTMLElement>);
    expect(rows.map(row => row.querySelector('strong')!.textContent)).toEqual(['user3', 'user2', 'user1']);
    expect(rows.map(row => row.textContent)).toEqual([
      jasmine.stringContaining('140'), jasmine.stringContaining('111'), jasmine.stringContaining('51')
    ]);
    expect(fixture.nativeElement.textContent).toContain('3 usuarios · 3 de 4 carreras con elecciones');
  });

  it('renders the welcome immediately and degrades silently on a season error', () => {
    expect(fixture.nativeElement.textContent).toContain('Así se juega');
    http.expectOne(req => req.url.endsWith('/seasons/fantasy')).flush('failed', { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.podium')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('degrades silently when classification fails', () => {
    http.expectOne(req => req.url.endsWith('/seasons/fantasy')).flush([{ number: 2 }]);
    http.expectOne(req => req.url.endsWith('/fantasy/clasification')).flush('failed', { status: 503, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.podium')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Así se juega');
  });

  it('does not request classification without Fantasy seasons', () => {
    http.expectOne(req => req.url.endsWith('/seasons/fantasy')).flush([]);
    http.expectNone(req => req.url.endsWith('/fantasy/clasification'));
    expect(fixture.componentInstance.podium()).toEqual([]);
  });

  it('omits the podium for an empty classification', () => {
    http.expectOne(req => req.url.endsWith('/seasons/fantasy')).flush([{ number: 2 }]);
    http.expectOne(req => req.url.endsWith('/fantasy/clasification')).flush({ ...fantasyFixture(), entries: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.podium')).toBeNull();
  });
});
