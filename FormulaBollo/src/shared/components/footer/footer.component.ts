import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
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

  // El pie cambia con cada evento del router (fuera de un evento de plantilla): por eso es estado en signals.
  protected readonly navigationRouters: WritableSignal<MenuItem[]> = signal<MenuItem[]>([]);
  protected readonly informationRouters: WritableSignal<MenuItem[]> = signal<MenuItem[]>([]);
  readonly isFantasy: WritableSignal<boolean> = signal(false);
  protected readonly textMainFooter: Signal<string> = computed(() => this.isFantasy()
    ? 'La experiencia Fantasy definitiva para los fanáticos de Formula Bollo.'
    : 'Una liga de Fórmula 1 entre amigos. Aquí vive cada carrera, cada sanción y cada récord.');

  protected readonly contactRouters: MenuItem[] = [
    { label: 'Discord', routerLink: 'https://discord.gg/43XHdBEDfV', icon: 'pi pi-discord' },
    { label: 'Correo', routerLink: 'mailto:ferenandoruiz@gmail.com', icon: 'pi pi-envelope' }
  ];

  ngOnInit(): void {
    this.checkIsFantasy();
    this.putItemsHeader();
    this.router.events.subscribe(() => {
      this.checkIsFantasy();
      this.putItemsHeader();
    });
  }

  putItemsHeader(): void {
    const isLogged: boolean = this.authJWTService.isLogged();

    if (this.isFantasy()) {
      this.navigationRouters.set([
        { label: 'Tu equipo', routerLink: '/fantasy/team', visible: true },
        { label: 'Clasificación', routerLink: '/fantasy/clasification', visible: true },
        { label: 'Iniciar sesión', routerLink: '/fantasy/login', visible: !isLogged },
        { label: 'Cerrar sesión', command: () => this.logout(), visible: isLogged }
      ]);

      this.informationRouters.set([
        { label: 'Presupuesto: $80M', routerLink: '' },
        { label: 'Precios dinámicos', routerLink: '' },
        { label: 'Liga competitiva', routerLink: '' }
      ]);

    } else {
      this.navigationRouters.set([
        { label: 'Inicio', routerLink: '/home', visible: true },
        { label: 'Pilotos', routerLink: '/drivers', visible: true },
        { label: 'Escuderías', routerLink: '/teams', visible: true }
      ]);

      this.informationRouters.set([
        { label: 'Estatuto', routerLink: '/statute' },
        { label: 'Estadísticas', routerLink: '/statistics' },
        { label: 'Resultados', routerLink: '/results' }
      ]);
    }
  }

  private logout(): void {
    this.authJWTService.logOut();
    this.putItemsHeader();
    void this.router.navigate(['/fantasy/login']);
  }

  checkIsFantasy(): void {
    this.isFantasy.set(!!this.router.url.includes("fantasy"));
  }

  protected scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
