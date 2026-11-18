import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { FantasyComponent } from './fantasy.component';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router, RouterLink } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

describe('FantasyComponent', () => {
  let component: FantasyComponent;
  let fixture: ComponentFixture<FantasyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyComponent],
      providers: [
        ...provideComponentTesting(),
        provideRouter([{ path: 'fantasy', component: FantasyComponent }]),
        { provide: ActivatedRoute, useFactory: () => TestBed.inject(Router).routerState.root },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FantasyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a single h1 with the Fantasy Bollo title', () => {
    const headings = fixture.debugElement.queryAll(By.css('h1'));

    expect(headings.length).toBe(1);
    expect(headings[0].nativeElement.textContent.trim()).toBe('Fantasy Bollo');
  });

  it('alternates the how-to-play section backgrounds', () => {
    const sections = fixture.debugElement.queryAll(By.css('div.border-y'));

    expect(sections.length).toBe(component.howToPlayList.length);
    expect(sections.length).toBe(4);
    sections.forEach((section, index) => {
      const element: HTMLElement = section.nativeElement;
      expect(element.classList.contains('bg-panel')).toBe(index % 2 === 0);
      expect(element.classList.contains('bg-panel-alt')).toBe(index % 2 === 1);
      expect(element.querySelector('h2')?.textContent?.trim()).toBe(component.howToPlayList[index].title);
    });
  });

  it('keeps the adventure cards as block anchors with their router links', () => {
    const cards = fixture.debugElement.queryAll(By.directive(RouterLink));

    expect(cards.length).toBe(3);
    expect(cards.map(card => card.injector.get(RouterLink).href)).toEqual([
      '/fantasy/team', '/fantasy/clasification', '/fantasy/login',
    ]);
    for (const card of cards) {
      const element: HTMLAnchorElement = card.nativeElement;
      expect(element.tagName).toBe('A');
      expect(element.classList.contains('block')).toBeTrue();
    }
  });

  it('renders focusable links with absolute destinations from the Fantasy route', async () => {
    const harness = await RouterTestingHarness.create('/fantasy');
    const links = harness.routeDebugElement!.queryAll(By.css('a'));

    expect(links.length).toBe(3);
    expect(links.map(link => link.nativeElement.getAttribute('href'))).toEqual([
      '/fantasy/team', '/fantasy/clasification', '/fantasy/login',
    ]);
    for (const link of links) {
      const element: HTMLAnchorElement = link.nativeElement;
      expect(element.tagName).toBe('A');
      expect(element.tabIndex).toBe(0);
      expect(element.hasAttribute('role')).toBeFalse();
      expect(element.hasAttribute('tabindex')).toBeFalse();
      expect(element.classList.contains('block')).toBeTrue();
      expect(link.listeners.filter(listener => listener.name === 'click').length).toBe(1);
      expect(link.listeners.some(listener => listener.name.startsWith('keydown'))).toBeFalse();
    }
  });
});
