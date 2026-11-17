import { AuthJWTService } from './../../services/authJWT.service';
import { Component, inject, Signal, signal, WritableSignal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { ThemeService } from '../../services/theme.service';
import { MessageInfoService } from '../../services/toastInfo.service';
import { SUCCESS_LOGOUT } from '../../../app/constants';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MenubarModule, ButtonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  readonly router: Router = inject(Router);
  private readonly themeService: ThemeService = inject(ThemeService);
  private readonly authJWTService: AuthJWTService = inject(AuthJWTService);
  private readonly messageInfoService: MessageInfoService = inject(MessageInfoService);

  protected readonly isDarkTheme: Signal<boolean> = this.themeService.isDarkTheme;
  // El menú cambia con cada evento del router (fuera de un evento de plantilla): por eso es estado en signals.
  protected readonly items: WritableSignal<MenuItem[]> = signal<MenuItem[]>([]);
  private readonly currentRoute: WritableSignal<string> = signal('');
  readonly isFantasy: WritableSignal<boolean> = signal(false);

  ngOnInit(): void {
    this.router.events.subscribe(() => {
      this.checkIsFantasy();
      this.putItemsHeader();
      this.currentRoute.set(this.router.url);
    });
  }

  putItemsHeader(): void {
    const isAdmin: boolean = this.authJWTService.checkAdmin(localStorage.getItem('auth')!);
    const isLogged: boolean = this.authJWTService.isLogged();

    if (this.isFantasy()) {
      this.items.set([
        { label: 'Tu equipo', icon: 'pi pi-sitemap', routerLink: '/fantasy/team' },
        { label: 'Clasificación', icon: 'pi pi-trophy', routerLink: '/fantasy/clasification' },
        { label: 'Iniciar sesión', icon: 'pi pi-sign-in', routerLink: '/fantasy/login', visible: !isLogged },
        { label: 'Cerrar sesión', icon: 'pi pi-sign-out', routerLink: '/fantasy/login', visible: isLogged, command: () => this.logoutAction() }
      ]);
    } else {
      this.items.set([
        { label: 'Pilotos', icon: 'pi pi-user', routerLink: '/drivers' },
        { label: 'Escuderías', icon: 'pi pi-car', routerLink: '/teams' },
        { label: 'Resultados', icon: 'pi pi-chart-bar', routerLink: '/results' },
        { label: 'Estatuto', icon: 'pi pi-file', routerLink: '/statute' },
        { label: 'Estadísticas', icon: 'pi pi-chart-line', routerLink: '/statistics' },
        { label: 'Administración', icon: 'pi pi-cog', routerLink: '/admin', visible: isAdmin }
      ]);
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