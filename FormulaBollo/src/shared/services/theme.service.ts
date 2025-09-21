import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  darkTheme = signal<boolean>(this.getInitialTheme());
  readonly isDarkTheme = this.darkTheme.asReadonly();

  constructor() {
    this.applyThemeClass(this.darkTheme());
  }

  toggleTheme(): void {
    this.setDarkTheme(!this.darkTheme());
  }

  setDarkTheme(isDark: boolean): void {
    this.darkTheme.set(isDark);
    this.applyThemeClass(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  private applyThemeClass(isDark: boolean): void {
    document.documentElement.classList.toggle('dark', isDark);
  }

  private getInitialTheme(): boolean {
    return localStorage.getItem('theme') === 'dark';
  }
}