import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormulaBolloPreset } from './app/app.config';

@Component({
  standalone: true,
  imports: [FormsModule, SelectModule, SelectButtonModule, ButtonModule],
  template: `
    <p-select [options]="options" [(ngModel)]="selected" />
    <p-selectbutton [options]="options" [(ngModel)]="selected" />
    <p-button class="fantasyHeaderButton" label="Fantasy" />
    <p-button class="bolloHeaderButton" label="Bollo" />
    <p-button class="header-button text-ink" icon="pi pi-sun" ariaLabel="Cambiar tema" />
    <p-button class="text-white" label="Guardar" />
  `
})
class ThemeControlsComponent {
  options = ['Carrera', 'Sprint'];
  selected: string | null = null;
}

describe('PrimeNG shared control theme', () => {
  let fixture: ComponentFixture<ThemeControlsComponent>;

  // Resolve CSS colors through the browser, since tokens may use hex while computed styles use rgb.
  function tokenColor(token: string): string {
    const probe = document.createElement('span');
    probe.style.color = `var(--${token})`;
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }

  beforeEach(async () => {
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({
      imports: [ThemeControlsComponent],
      providers: [
        provideZonelessChangeDetection(),
        providePrimeNG({ theme: {
          preset: FormulaBolloPreset,
          options: {
            darkModeSelector: '.dark',
            cssLayer: { name: 'primeng', order: 'tailwind-utilities, tailwind, primeng' }
          }
        } })
      ]
    });
    fixture = TestBed.createComponent(ThemeControlsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    // Measure the final theme colors without waiting for decorative transitions.
    fixture.nativeElement.querySelectorAll('.p-select, .p-togglebutton, .p-togglebutton-content, .p-button')
      .forEach((control: HTMLElement) => control.style.transition = 'none');
  });

  afterEach(() => {
    fixture.destroy();
    document.documentElement.classList.remove('dark');
  });

  it('uses the panel token for the select in light and dark mode', () => {
    const select: HTMLElement = fixture.nativeElement.querySelector('.p-select');
    const lightPanel = tokenColor('panel');
    expect(getComputedStyle(select).backgroundColor).toBe(lightPanel);

    document.documentElement.classList.add('dark');
    const darkPanel = tokenColor('panel');
    expect(darkPanel).not.toBe(lightPanel);
    expect(getComputedStyle(select).backgroundColor).toBe(darkPanel);
  });

  it('uses pit and on-pit for a selected toggle in both modes without an inner shadow', async () => {
    fixture.nativeElement.querySelector('.p-togglebutton').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected).toBe('Carrera');
    const checked: HTMLElement = fixture.nativeElement.querySelector('.p-togglebutton-checked');
    const content: HTMLElement = checked.querySelector('.p-togglebutton-content')!;
    for (const dark of [false, true]) {
      document.documentElement.classList.toggle('dark', dark);
      expect(getComputedStyle(checked).backgroundColor).toBe(tokenColor('pit'));
      expect(getComputedStyle(checked).color).toBe(tokenColor('on-pit'));
      expect(getComputedStyle(content).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(content).boxShadow).toBe('none');
    }
  });

  it('preserves header button colors and explicit white text on the host', () => {
    for (const dark of [false, true]) {
      document.documentElement.classList.toggle('dark', dark);
      for (const [hook, background, foreground] of [
        ['fantasyHeaderButton', 'fantasy', 'on-fantasy'],
        ['bolloHeaderButton', 'accent', 'on-accent']
      ]) {
        const button = fixture.nativeElement.querySelector(`.${hook} .p-button`);
        expect(getComputedStyle(button).backgroundColor).toBe(tokenColor(background));
        expect(getComputedStyle(button).color).toBe(tokenColor(foreground));
      }
      const whiteButton = fixture.nativeElement.querySelector('p-button.text-white .p-button');
      expect(getComputedStyle(whiteButton).color).toBe(tokenColor('color-white'));
      const themeButton = fixture.nativeElement.querySelector('.header-button .p-button');
      expect(getComputedStyle(themeButton).backgroundColor).toBe(tokenColor('panel-alt'));
      expect(getComputedStyle(themeButton).color).toBe(tokenColor('ink'));
    }
  });
});
