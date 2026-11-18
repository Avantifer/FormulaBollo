import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { driverPointsFixture, provideComponentTesting, teamPointsFixture } from '../../../../testing/component-test-providers';
import { FantasyClasificationComponent } from './fantasy-clasification.component';
import { FantasyPointsUser } from '../../../../shared/models/fantasyPointsUser';
import { Race } from '../../../../shared/models/race';

describe('FantasyClasificationComponent', () => {
  let component: FantasyClasificationComponent;
  let fixture: ComponentFixture<FantasyClasificationComponent>;

  const fantasyPointsUserFixture: FantasyPointsUser = {
    account: { id: 1, username: 'Usuario de prueba' },
    fantasyElection: {
      id: 1,
      user: { id: 1, username: 'Usuario de prueba' },
      driverOne: driverPointsFixture.driver,
      driverTwo: teamPointsFixture.driver2.driver,
      driverThree: { ...driverPointsFixture.driver, id: 3, name: 'Tercer piloto' },
      teamOne: teamPointsFixture.team,
      teamTwo: { ...teamPointsFixture.team, id: 2, name: 'McLaren' },
      race: new Race(1, 'Circuito de prueba', '', '', new Date(), driverPointsFixture.driver.season, 1),
      season: driverPointsFixture.driver.season,
    },
    totalPoints: 100,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyClasificationComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(FantasyClasificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the timing tower with Fantasy borders, points and the leading position', async () => {
    component.fantasyPointsUsers.set([
      fantasyPointsUserFixture,
      { ...fantasyPointsUserFixture, account: { id: 2, username: 'Segundo usuario' }, totalPoints: 80 },
    ]);
    fixture.detectChanges();

    const table: HTMLElement = fixture.nativeElement.querySelector('.timing-tower');
    expect(table).not.toBeNull();
    expect(table.querySelector('th.tt-points')?.textContent?.trim()).toBe('Puntos totales');

    const rows = table.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    const fantasyHex = getComputedStyle(document.documentElement).getPropertyValue('--fantasy').trim();
    expect(fantasyHex).toMatch(/^#[0-9a-f]{6}$/i);
    const fantasyRgb = `rgb(${[1, 3, 5].map(start => parseInt(fantasyHex.slice(start, start + 2), 16)).join(', ')})`;
    rows.forEach((row, index) => {
      const positionCell = row.querySelector<HTMLTableCellElement>('td:first-child')!;
      expect(positionCell.classList.contains('tt-tab-fantasy')).toBeTrue();
      expect(getComputedStyle(positionCell).borderLeftColor).toBe(fantasyRgb);
      expect(row.querySelectorAll('td.tt-points').length).toBe(1);
      expect(row.querySelector('td.tt-points')?.textContent?.trim()).toBe(index === 0 ? '100' : '80');
    });

    const leader = rows[0].querySelector('td:first-child > div');
    expect(leader?.textContent?.trim()).toBe('1');
    expect(leader?.classList.contains('bg-fantasy')).toBeTrue();
    expect(leader?.classList.contains('text-on-fantasy')).toBeTrue();
    expect(rows[1].querySelector('td:first-child > div')?.classList.contains('bg-pit')).toBeTrue();

    // Un iframe aplica las media queries al ancho móvil real sin cambiar la ventana de Karma.
    const frame = document.createElement('iframe');
    frame.style.cssText = 'width: 375px; height: 812px; border: 0;';
    document.body.appendChild(frame);
    const mobileDocument = frame.contentDocument!;
    const host: HTMLElement = fixture.nativeElement;
    const parent = host.parentNode!;
    try {
      const stylesLoaded = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(style => {
        const clone = style.cloneNode(true) as HTMLElement;
        const loaded = style.tagName === 'LINK'
          ? new Promise<void>((resolve, reject) => {
              clone.onload = () => resolve();
              clone.onerror = () => reject(new Error('Mobile test stylesheet failed to load'));
            })
          : Promise.resolve();
        mobileDocument.head.appendChild(clone);
        return loaded;
      });
      mobileDocument.body.appendChild(host);
      await Promise.all(stylesLoaded);
      rows[1].querySelector('td:nth-child(2) p')!.textContent = 'UsuarioConUnNombreMuyLargoSinEspacios';

      for (const dark of [false, true]) {
        mobileDocument.documentElement.classList.toggle('dark', dark);
        const scrollContainer = table.querySelector('.p-datatable-table-container')!;
        expect(mobileDocument.documentElement.clientWidth).toBe(375);
        expect(mobileDocument.documentElement.scrollWidth).toBeLessThanOrEqual(375);
        expect(scrollContainer.scrollWidth).toBeLessThanOrEqual(scrollContainer.clientWidth);
      }
    } finally {
      parent.appendChild(host);
      frame.remove();
    }
  });

  it('opens the Fantasy team dialog with the selected username when Ver Equipo is clicked', async () => {
    component.fantasyPointsUsers.set([fantasyPointsUserFixture]);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.fantasyClasificationButton button');
    expect(button.textContent?.trim()).toBe('Ver Equipo');
    button.click();

    const http = TestBed.inject(HttpTestingController);
    const pointsRequests = http.match(request =>
      request.url.endsWith('/driverPointsSpecificRace') || request.url.endsWith('/teamsPointsSpecificRace')
    );
    expect(pointsRequests.length).toBe(5);
    pointsRequests.forEach(request => request.flush({ points: 20 }));
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog: HTMLElement = fixture.nativeElement.querySelector('.p-dialog.fantasy-dialog');
    expect(component.showDialog).toBeTrue();
    expect(dialog).not.toBeNull();
    expect(dialog.querySelector('h3')?.textContent?.trim()).toBe('Equipo de Usuario de prueba');
    expect(dialog.textContent).toContain('Pilotos Seleccionados');
    expect(dialog.textContent).toContain('Equipos Seleccionados');
    expect(dialog.textContent).toContain('Tercer piloto');
    expect(dialog.textContent).toContain('McLaren');
    expect(component.showAllPoints()).toBe(100);
  });
});
