import { AuthJWTService } from './../../services/authJWT.service';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { fromEvent } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../services/theme.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { SUCCESS_LOGOUT } from '../../../app/constants';

const HIDE_AFTER_PX = 12;
const SHOW_AFTER_PX = 8;
const EDGE_PX = 8;

interface HeaderItem {
  label: string;
  shortLabel?: string;
  icon: string;
  routerLink?: string;
  visible?: boolean;
  command?: () => void;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ButtonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  readonly router: Router = inject(Router);
  private readonly themeService: ThemeService = inject(ThemeService);
  private readonly authJWTService: AuthJWTService = inject(AuthJWTService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isDarkTheme: Signal<boolean> = this.themeService.isDarkTheme;
  // La navegación completada actualiza el menú fuera de un evento de plantilla.
  protected readonly items: WritableSignal<HeaderItem[]> = signal<HeaderItem[]>([]);
  protected readonly visibleCount: WritableSignal<number> = signal(0);
  private readonly currentRoute: WritableSignal<string> = signal('');
  readonly isFantasy: WritableSignal<boolean> = signal(false);
  readonly bottomDockHidden = signal(false);
  private previousScrollY = window.scrollY;
  private directionalScroll = 0;

  ngOnInit(): void {
    const updateNavigation = () => {
      this.checkIsFantasy();
      this.putItemsHeader();
      this.currentRoute.set(this.router.url);
    };
    updateNavigation();
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event instanceof NavigationEnd) {
        updateNavigation();
        this.showBottomDock();
      }
    });
    fromEvent(window, 'scroll', { passive: true }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateBottomDock());
  }

  showBottomDock(): void {
    this.bottomDockHidden.set(false);
    this.previousScrollY = window.scrollY;
    this.directionalScroll = 0;
  }

  private updateBottomDock(): void {
    const scrollY = window.scrollY;
    const delta = scrollY - this.previousScrollY;
    this.previousScrollY = scrollY;

    if (scrollY < EDGE_PX || scrollY + window.innerHeight >= document.documentElement.scrollHeight - EDGE_PX) {
      this.showBottomDock();
      return;
    }
    if (delta === 0) {
      return;
    }

    this.directionalScroll = (delta > 0) === (this.directionalScroll > 0)
      ? this.directionalScroll + delta : delta;
    if (this.directionalScroll >= HIDE_AFTER_PX) {
      this.bottomDockHidden.set(true);
    } else if (this.directionalScroll <= -SHOW_AFTER_PX) {
      this.bottomDockHidden.set(false);
    }
  }

  putItemsHeader(): void {
    const isAdmin: boolean = this.authJWTService.checkAdmin(localStorage.getItem('auth')!);
    const isLogged: boolean = this.authJWTService.isLogged();

    if (this.isFantasy()) {
      const items: HeaderItem[] = [
        { label: 'Tu equipo', icon: 'pi pi-sitemap', routerLink: '/fantasy/team' },
        { label: 'Clasificación', icon: 'pi pi-trophy', routerLink: '/fantasy/clasification' },
        { label: 'Iniciar sesión', icon: 'pi pi-sign-in', routerLink: '/fantasy/login', visible: !isLogged },
        { label: 'Cerrar sesión', icon: 'pi pi-sign-out', visible: isLogged, command: () => this.logoutAction() }
      ];
      this.items.set(items);
      this.visibleCount.set(items.filter(item => item.visible !== false).length);
    } else {
      const items: HeaderItem[] = [
        { label: 'Pilotos', icon: 'pi pi-user', routerLink: '/drivers' },
        { label: 'Escuderías', shortLabel: 'Escud.', icon: 'pi pi-car', routerLink: '/teams' },
        { label: 'Resultados', shortLabel: 'Result.', icon: 'pi pi-chart-bar', routerLink: '/results' },
        { label: 'Estatuto', icon: 'pi pi-file', routerLink: '/statute' },
        { label: 'Estadísticas', shortLabel: 'Estad.', icon: 'pi pi-chart-line', routerLink: '/statistics' },
        { label: 'Administración', shortLabel: 'Admin', icon: 'pi pi-cog', routerLink: '/admin', visible: isAdmin }
      ];
      this.items.set(items);
      this.visibleCount.set(items.filter(item => item.visible !== false).length);
    }
  }

  checkIsFantasy(): void {
    this.isFantasy.set(!!this.router.url.includes("fantasy"));
  }

  toggleDarkMode(): void {
    this.themeService.toggleTheme();
  }

  isActive(route: string): boolean {
    const currentRoute: string = this.currentRoute();
    if (currentRoute.includes('fantasy')) {
      return ('/' + currentRoute.split('/')[1] + '/' + currentRoute.split('/')[2]) === route;
    } else {
      return ('/' + currentRoute.split('/')[1]) === route;
    }
  }

  private logoutAction(): void {
    localStorage.removeItem("auth");
    this.authJWTService.isLogged();
    this.messageInfoService.showSuccess(SUCCESS_LOGOUT);
    this.router.navigate(["fantasy/login"]);
  }
}
