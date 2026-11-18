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
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme === 'dark';
      }
    } catch {
      // Si el almacenamiento no está disponible, consulta el tema del sistema.
    }

    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }
}
