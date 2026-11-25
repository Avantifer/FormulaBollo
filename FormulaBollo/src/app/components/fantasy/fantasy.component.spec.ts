import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { AuthJWTService } from '../../../shared/services/authJWT.service';
import { FantasyComponent } from './fantasy.component';
import { fantasyFixture } from './fantasy-clasification/fantasy-clasification.fixture';

describe('FantasyComponent', () => {
  let fixture: ComponentFixture<FantasyComponent>;
  let http: HttpTestingController;
  const root = () => fixture.nativeElement as HTMLElement;
  const hrefs = () => fixture.debugElement.queryAll(By.directive(RouterLink)).map(link => link.injector.get(RouterLink).href);

  function create(logged = false): void {
    TestBed.configureTestingModule({
      imports: [FantasyComponent],
      providers: [...provideComponentTesting(), { provide: AuthJWTService, useValue: { isLogged: () => logged } }]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FantasyComponent);
    fixture.detectChanges();
  }

  function load(races: unknown[] = [{ id: 28, name: 'Monza', dateStart: '2024-09-01T15:00:00' }]): void {
    http.expectOne(request => request.url.endsWith('/seasons/fantasy')).flush([{ number: 1 }, { number: 2 }]);
    const clasification = http.expectOne(request => request.url.endsWith('/fantasy/clasification'));
    expect(clasification.request.params.get('numberSeason')).toBe('2');
    clasification.flush(fantasyFixture());
    const calendar = http.expectOne(request => request.url.endsWith('/races/all'));
    expect(calendar.request.params.get('season')).toBe('2');
    calendar.flush(races);
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
    http.verify({ ignoreCancelled: true });
  });

  describe('without data', () => {
    beforeEach(() => create());

    it('renders a single h1 and the three ways in before any data arrives', () => {
      expect(root().querySelectorAll('h1').length).toBe(1);
      expect(root().querySelector('h1')!.textContent!.trim()).toBe('Fantasy Bollo');
      expect(Array.from(root().querySelectorAll('h2')).map(heading => heading.textContent!.trim()).slice(0, 3)).toEqual(['Tu equipo', 'Clasificación', 'Iniciar sesión']);
      expect(root().textContent).toContain('$80M');
      expect(root().querySelectorAll('li.border-dashed').length).toBe(5);
      expect(root().querySelector('table')).toBeNull();
    });

    it('sends visitors to register and keeps every access link pointing at the Fantasy routes', () => {
      expect(root().querySelector('a.go')!.textContent!.trim()).toBe('Crear mi equipo');
      expect(hrefs()).toEqual(['/fantasy/register', '/fantasy/clasification', '/fantasy/login', '/fantasy/register']);
    });

    it('keeps the four rules complete in an accordion with only the first one open', () => {
      const items = Array.from(root().querySelectorAll('details'));
      const text = items.map(item => item.textContent!);

      expect(items.map(item => item.hasAttribute('open'))).toEqual([true, false, false, false]);
      expect(items.map(item => item.querySelector('summary b')!.textContent!.trim())).toEqual(['Crea tu equipo', 'Precios dinámicos', 'Sistema de puntuación', 'Clasificación']);
      expect(text[0]).toContain('3 pilotos y 2 escuderías');
      expect(text[0]).toContain('80 millones');
      expect(text[0]).toContain('NO se guarda automáticamente');
      expect(text[0]).toContain('hasta 12 horas antes de la carrera');
      expect(text[1]).toContain('precio de los equipos');
      expect(text[2]).toContain('vuelta rápida');
      expect(text[2]).toContain('pole');
      expect(text[2]).toContain('DNF');
      expect(text[3]).toContain('misma liga');
      expect(text[3]).toContain('ver el equipo que escogieron');
      for (const image of Array.from(root().querySelectorAll<HTMLImageElement>('details img'))) {
        expect(image.alt).not.toBe('');
        expect(image.getAttribute('loading')).toBe('lazy');
      }
    });

    it('shows a light and a dark screenshot per rule and the theme class picks which one is visible', () => {
      const items = fixture.componentInstance.howToPlay;

      expect(items.length).toBe(4);
      for (const item of items) {
        expect(item.image).toMatch(/^fantasy\/fantasyHowToPlay\d\.avif/);
        expect(item.imageLight).toBe(item.image.replace('.avif', '-light.avif'));
      }
      for (const item of Array.from(root().querySelectorAll('details'))) {
        const images = Array.from(item.querySelectorAll<HTMLImageElement>('img'));
        const light = images.filter(image => image.classList.contains('dark:hidden'));
        const dark = images.filter(image => image.classList.contains('dark:block') && image.classList.contains('hidden'));

        expect(images.length).toBe(2);
        expect(light.length).toBe(1);
        expect(dark.length).toBe(1);
        expect(light[0].alt).toBe(dark[0].alt);
      }
    });

    it('degrades silently when the seasons request fails', () => {
      http.expectOne(request => request.url.endsWith('/seasons/fantasy')).flush('failed', { status: 500, statusText: 'Error' });
      fixture.detectChanges();

      expect(root().querySelector('table')).toBeNull();
      expect(root().querySelector('[role="alert"]')).toBeNull();
      expect(root().textContent).toContain('Consulta cómo va la liga');
      expect(root().textContent).not.toContain('Temporada ');
      expect(root().querySelectorAll('details').length).toBe(4);
    });

    it('degrades silently when the classification fails and when there is no Fantasy season', () => {
      http.expectOne(request => request.url.endsWith('/seasons/fantasy')).flush([{ number: 2 }]);
      http.expectOne(request => request.url.endsWith('/fantasy/clasification')).flush('failed', { status: 503, statusText: 'Error' });
      http.expectOne(request => request.url.endsWith('/races/all')).flush([]);
      fixture.detectChanges();

      expect(root().querySelector('table')).toBeNull();
      expect(root().querySelectorAll('li.border-dashed').length).toBe(5);
    });

    it('does not request the classification when there are no Fantasy seasons', () => {
      http.expectOne(request => request.url.endsWith('/seasons/fantasy')).flush([]);
      fixture.detectChanges();

      http.expectNone(request => request.url.endsWith('/fantasy/clasification'));
      expect(root().querySelector('table')).toBeNull();
    });
  });

  describe('with the latest Fantasy season', () => {
    beforeEach(() => { create(); load(); });

    it('shows the top of the classification with the leader first and the gap to the leader', () => {
      const rows = Array.from(root().querySelectorAll('tbody tr'));

      expect(rows.map(row => row.children[1].textContent!.trim())).toEqual(['user3', 'user2', 'user1']);
      expect(rows.map(row => row.children[2].textContent!.trim())).toEqual(['140', '111', '51']);
      expect(rows.map(row => row.children[3].textContent!.trim())).toEqual(['Líder', '−29', '−89']);
      expect(rows[0].querySelector('span')!.className).toContain('bg-fantasy');
      expect(rows[1].querySelector('span')!.className).toContain('bg-pit');
      expect(root().textContent).toContain('Temporada 2, los 3 primeros de 3');
      expect(root().querySelector('table caption')!.textContent).toContain('cinco primeros');
    });

    it('draws the most picked drivers and teams with how many times they were chosen', () => {
      const picks = root().querySelector('ul[aria-label="Pilotos y escuderías más elegidos"]')!;
      const names = Array.from(picks.querySelectorAll('strong')).map(name => name.textContent!.trim());

      expect(names).toEqual(['Dani Calde', 'Juanudi', 'Moraga', 'Ferrari', 'McLaren']);
      expect(picks.textContent).toContain('6 veces');
      expect(root().querySelectorAll('li.border-dashed').length).toBe(0);
    });

    it('shows the league figures and the season calendar strip with the next race and its date', () => {
      const figures = Array.from(root().querySelectorAll('dl dd')).map(figure => figure.textContent!.replace(/\s+/g, ' ').trim());

      expect(figures).toEqual(['3', '3 de 4', '302', '100 user3']);
      expect(root().textContent).toContain('Quedan 1 carrera');
      expect(root().textContent).toContain('3 de 4 carreras jugadas (75 %)');
      expect(root().querySelectorAll('ol[aria-hidden="true"] li').length).toBe(4);
      expect(Array.from(root().querySelectorAll('ol[aria-hidden="true"] li')).map(segment => segment.className.includes('bg-fantasy'))).toEqual([true, true, true, false]);
      const next = root().querySelector('ol[aria-label="Próximas carreras"] li')!;
      expect(next.textContent).toContain('Monza');
      expect(next.textContent).toContain('15:00');
      expect(root().textContent).toContain('Próxima jornada');
    });
  });

  it('keeps the calendar without dates when the races request fails', () => {
    create();
    http.expectOne(request => request.url.endsWith('/seasons/fantasy')).flush([{ number: 2 }]);
    http.expectOne(request => request.url.endsWith('/fantasy/clasification')).flush(fantasyFixture());
    http.expectOne(request => request.url.endsWith('/races/all')).flush('failed', { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const next = root().querySelector('ol[aria-label="Próximas carreras"] li')!;
    expect(next.textContent).toContain('Monza');
    expect(next.textContent).not.toMatch(/\d{2}:\d{2}/);
    expect(root().querySelectorAll('tbody tr').length).toBe(3);
  });

  it('does not wait for the calendar to show the classification and adds the dates when they arrive', () => {
    create();
    http.expectOne(request => request.url.endsWith('/seasons/fantasy')).flush([{ number: 2 }]);
    http.expectOne(request => request.url.endsWith('/fantasy/clasification')).flush(fantasyFixture());
    fixture.detectChanges();

    expect(root().querySelectorAll('tbody tr').length).toBe(3);
    expect(root().querySelector('ol[aria-label="Próximas carreras"] li')!.textContent).not.toMatch(/\d{2}:\d{2}/);
    http.expectOne(request => request.url.endsWith('/races/all')).flush([{ id: 28, name: 'Monza', dateStart: '2024-09-01T15:00:00' }]);
    fixture.detectChanges();
    expect(root().querySelector('ol[aria-label="Próximas carreras"] li')!.textContent).toContain('15:00');
  });

  it('marks every user tied for first place as leader', () => {
    create();
    http.expectOne(request => request.url.endsWith('/seasons/fantasy')).flush([{ number: 2 }]);
    const data = fantasyFixture();
    data.entries.push({ ...data.entries[0], account: { id: 9, username: 'user9' }, raceId: 27, points: 140 });
    data.entries.push({ ...data.entries[0], account: { id: 9, username: 'user9' }, raceId: 25, points: 0 });
    http.expectOne(request => request.url.endsWith('/fantasy/clasification')).flush(data);
    http.expectOne(request => request.url.endsWith('/races/all')).flush([]);
    fixture.detectChanges();

    const rows = Array.from(root().querySelectorAll('tbody tr'));
    const leaders = rows.filter(row => row.children[3].textContent!.trim() === 'Líder');
    expect(leaders.length).toBe(2);
    expect(leaders.every(row => row.querySelector('span')!.className.includes('bg-fantasy'))).toBeTrue();
  });

  it('shows the finished season without upcoming races when every race was played', () => {
    create();
    http.expectOne(request => request.url.endsWith('/seasons/fantasy')).flush([{ number: 2 }]);
    const data = fantasyFixture();
    data.races.forEach(race => race.finished = true);
    http.expectOne(request => request.url.endsWith('/fantasy/clasification')).flush(data);
    http.expectOne(request => request.url.endsWith('/races/all')).flush([]);
    fixture.detectChanges();

    expect(root().textContent).toContain('Temporada terminada');
    expect(root().querySelector('ol[aria-label="Próximas carreras"]')).toBeNull();
    expect(root().textContent).not.toContain('Próxima jornada');
  });

  it('hides the sign-in zone and sends the user to the team page when there is a session', () => {
    create(true);
    load();

    expect(Array.from(root().querySelectorAll('h2')).map(heading => heading.textContent!.trim())).not.toContain('Iniciar sesión');
    expect(root().querySelector('a.go')!.getAttribute('href')).toBe('/fantasy/team');
    expect(hrefs()).toEqual(['/fantasy/team', '/fantasy/clasification']);
  });
});
