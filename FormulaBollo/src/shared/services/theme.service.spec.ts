import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let matchMedia: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    matchMedia = spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('prefers saved dark over a light system theme', () => {
    localStorage.setItem('theme', 'dark');

    expect(TestBed.inject(ThemeService).isDarkTheme()).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it('prefers saved light over a dark system theme', () => {
    localStorage.setItem('theme', 'light');
    matchMedia.and.returnValue({ matches: true } as MediaQueryList);

    expect(TestBed.inject(ThemeService).isDarkTheme()).toBeFalse();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it('uses a dark system theme without a saved preference', () => {
    matchMedia.and.returnValue({ matches: true } as MediaQueryList);

    expect(TestBed.inject(ThemeService).isDarkTheme()).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('uses a light system theme without a saved preference', () => {
    expect(TestBed.inject(ThemeService).isDarkTheme()).toBeFalse();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('uses the system theme for an unrecognized saved preference', () => {
    localStorage.setItem('theme', 'unknown');
    matchMedia.and.returnValue({ matches: true } as MediaQueryList);

    expect(TestBed.inject(ThemeService).isDarkTheme()).toBeTrue();
  });

  it('uses the system theme when reading storage throws', () => {
    spyOn(localStorage, 'getItem').and.throwError('Storage unavailable');
    matchMedia.and.returnValue({ matches: true } as MediaQueryList);

    expect(TestBed.inject(ThemeService).isDarkTheme()).toBeTrue();
  });

  it('defaults to light when matchMedia throws', () => {
    matchMedia.and.throwError('Media queries unavailable');

    expect(TestBed.inject(ThemeService).isDarkTheme()).toBeFalse();
  });

  it('defaults to light when matchMedia is missing', () => {
    // Calling an absent API raises TypeError inside the guarded initialization.
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: undefined });

    expect(TestBed.inject(ThemeService).isDarkTheme()).toBeFalse();
  });

  it('toggles the signal, document class and saved preference in both directions', () => {
    const service = TestBed.inject(ThemeService);

    service.toggleTheme();
    expect(service.isDarkTheme()).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(localStorage.getItem('theme')).toBe('dark');

    service.toggleTheme();
    expect(service.isDarkTheme()).toBeFalse();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
