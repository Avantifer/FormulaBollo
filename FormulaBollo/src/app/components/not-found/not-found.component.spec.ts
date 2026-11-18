import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { routes } from '../../app.routes';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: provideComponentTesting(),
    }).compileComponents();
    fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture?.destroy());

  it('renders a single not-found heading and explanation', () => {
    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent.trim()).toBe('Página no encontrada');
    expect(fixture.nativeElement.querySelector('p').textContent.trim())
      .toBe('La dirección que buscas no existe o ha cambiado.');
  });

  it('links back to the home page with RouterLink', () => {
    const link = fixture.debugElement.query(By.directive(RouterLink));
    expect(link.nativeElement.textContent.trim()).toBe('Volver a la portada');
    expect(link.injector.get(RouterLink).href).toBe('/home');
  });

  it('places the wildcard route last', () => {
    expect(routes[routes.length - 1].path).toBe('**');
  });
});
