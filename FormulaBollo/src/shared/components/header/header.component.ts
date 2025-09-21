import { AuthJWTService } from './../../services/authJWT.service';
import { Component, inject, Signal } from '@angular/core';
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
  protected items: MenuItem[] = [];
  private currentRoute = '';
  isFantasy: boolean = false;

  ngOnInit(): void {
    this.router.events.subscribe(() => {
      this.checkIsFantasy();
      this.putItemsHeader();
      this.currentRoute = this.router.url;
    });
  }

  putItemsHeader(): void {
    const isAdmin: boolean = this.authJWTService.checkAdmin(localStorage.getItem('auth')!);
    const isLogged: boolean = this.authJWTService.isLogged();

    if (this.isFantasy) {
      this.items = [
        { label: 'Tu equipo', icon: 'pi pi-sitemap', routerLink: '/fantasy/team' },
        { label: 'Clasificación', icon: 'pi pi-trophy', routerLink: '/fantasy/clasification' },
        { label: 'Iniciar sesión', icon: 'pi pi-sign-in', routerLink: '/fantasy/login', visible: !isLogged },
        { label: 'Cerrar sesión', icon: 'pi pi-sign-out', routerLink: '/fantasy/login', visible: isLogged, command: () => this.logoutAction() }
      ];
    } else {
      this.items = [
        { label: 'Pilotos', icon: 'pi pi-user', routerLink: '/drivers' },
        { label: 'Escuderías', icon: 'pi pi-car', routerLink: '/teams' },
        { label: 'Resultados', icon: 'pi pi-chart-bar', routerLink: '/results' },
        { label: 'Estatuto', icon: 'pi pi-file', routerLink: '/statute' },
        { label: 'Estadísticas', icon: 'pi pi-chart-line', routerLink: '/statistics' },
        { label: 'Administración', icon: 'pi pi-cog', routerLink: '/admin', visible: isAdmin }
      ];
    }
  }

  checkIsFantasy(): void {
    this.isFantasy = !!this.router.url.includes("fantasy");
  }

  toggleDarkMode(): void {
    this.themeService.toggleTheme();
  }

  isActive(route: string): boolean {
    if (this.currentRoute.includes('fantasy')) {
      return ('/' + this.currentRoute.split('/')[1] + '/' + this.currentRoute.split('/')[2]) === route;
    } else {
      return ('/' + this.currentRoute.split('/')[1]) === route;
    }
  }

  private logoutAction(): void {
    localStorage.removeItem("auth");
    this.authJWTService.isLogged();
    this.messageInfoService.showSuccess(SUCCESS_LOGOUT);
    this.router.navigate(["fantasy/login"]);
  }
}