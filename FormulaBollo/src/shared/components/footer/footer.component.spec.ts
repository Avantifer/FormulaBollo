import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { FooterComponent } from './footer.component';
import { By } from '@angular/platform-browser';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: provideComponentTesting(),
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders focusable Fantasy information buttons that scroll to the top', () => {
    component.isFantasy.set(true);
    component.putItemsHeader();
    fixture.detectChanges();
    const scrollTo = spyOn(window, 'scrollTo');

    const buttons = fixture.debugElement.queryAll(By.css('button')).filter(button =>
      button.nativeElement.closest('.flex-col').querySelector('h3').textContent.trim() === 'Información',
    );
    expect(buttons.length).toBe(3);
    for (const button of buttons) {
      const element: HTMLButtonElement = button.nativeElement;
      expect(element.tagName).toBe('BUTTON');
      expect(element.type).toBe('button');
      expect(element.tabIndex).toBe(0);
      expect(element.hasAttribute('href')).toBeFalse();
      expect(element.classList.contains('text-left')).toBeTrue();
      const style = getComputedStyle(element);
      const parentStyle = getComputedStyle(element.parentElement!);
      expect(style.fontFamily).toBe(parentStyle.fontFamily);
      expect(style.fontSize).toBe(parentStyle.fontSize);
      expect(style.color).toBe(parentStyle.color);
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(style.textAlign).toBe('left');
      expect(button.listeners.filter(listener => listener.name === 'click').length).toBe(1);
      expect(button.listeners.some(listener => listener.name.startsWith('keydown'))).toBeFalse();
      element.click();
    }
    expect(scrollTo).toHaveBeenCalledTimes(3);
    expect(scrollTo.calls.mostRecent().args as unknown[]).toEqual([{ top: 0, behavior: 'smooth' }]);
  });
});
