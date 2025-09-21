import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AuthJWTService } from '../../services/authJWT.service';

@Component({
  selector: 'app-footer',
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {  
  readonly router: Router = inject(Router);
  private readonly authJWTService: AuthJWTService = inject(AuthJWTService);

  protected navigationRouters: MenuItem[] = [];
  protected informationRouters: MenuItem[] = [];
  textMainFooter: string = "";

  protected readonly contactRouters: MenuItem[] = [
    { label: 'Discord', routerLink: 'https://discord.gg/43XHdBEDfV', icon: 'pi pi-discord' },
    { label: 'Correo', routerLink: 'mailto:ferenandoruiz@gmail.com', icon: 'pi pi-envelope' }
  ];

  isFantasy: boolean = false;

  ngOnInit(): void {
    this.router.events.subscribe(() => {
      this.checkIsFantasy();
      this.setTextMain();
      this.putItemsHeader();
    });
  }

  putItemsHeader(): void {
    const isLogged: boolean = this.authJWTService.isLogged();

    if (this.isFantasy) {
      this.navigationRouters = [
        { label: 'Tu equipo', routerLink: '/fantasy/team', visible: true },
        { label: 'Clasificación', routerLink: '/fantasy/clasification', visible: true },
        { label: 'Iniciar sesión', routerLink: '/fantasy/login', visible: !isLogged },
        { label: 'Cerrar sesión', routerLink: '/fantasy/logout', visible: isLogged }
      ];

      this.informationRouters = [
        { label: 'Presupuesto: $80M', routerLink: '' },
        { label: 'Precios dinámicos', routerLink: '' },
        { label: 'Liga competitiva', routerLink: '' }
      ];

    } else {
      this.navigationRouters = [
        { label: 'Inicio', routerLink: '/home', visible: true },
        { label: 'Pilotos', routerLink: '/drivers', visible: true },
        { label: 'Escuderías', routerLink: '/teams', visible: true }
      ];

      this.informationRouters = [
        { label: 'Estatuto', routerLink: '/statute' },
        { label: 'Estadísticas', routerLink: '/stats' },
        { label: 'Resultados', routerLink: '/results' }
      ];
    }
  }

  checkIsFantasy(): void {
    this.isFantasy = !!this.router.url.includes("fantasy");
  }

  setTextMain(): void {
    if (this.isFantasy) {
      this.textMainFooter = 'La experiencia Fantasy definitiva para los fanáticos de Formula Bollo.';
    } else {
      this.textMainFooter = 'La mejor liga de Formula 1 creada y organizada por un grupo de amigos.';
    }
  }

  protected scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
