import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  for (const [route, label] of [['results', 'Resultados'], ['penalties', 'Penalizaciones'], ['sprints', 'Sprints']]) {
    it(`marks only the ${route} menu item as selected`, async () => {
      spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue(`/admin/${route}`);
      fixture.detectChanges();
      await fixture.whenStable();

      const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('p-menu a'));
      expect(links.length).toBe(3);
      expect(links.filter(link => link.classList.contains('menu-item-selected')).length).toBe(1);
      links.forEach(link => {
        expect(link.classList.contains('menu-item-selected'))
          .withContext(link.textContent!.trim())
          .toBe(link.textContent!.trim() === label);
      });
    });
  }
});
