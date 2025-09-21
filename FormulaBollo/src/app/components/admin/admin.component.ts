import { MenuModule } from 'primeng/menu';
import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MenuItem } from 'primeng/api';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin',
  imports: [
    ButtonModule,
    DividerModule,
    MenuModule,
    RouterModule
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  private readonly router: Router = inject(Router);

  items: MenuItem[] =  [
    {
      items: [
        { label: 'Resultados', icon: 'pi pi-list', routerLink: 'results' },
        { label: 'Penalizaciones', icon: 'pi pi-exclamation-triangle', routerLink: 'penalties' },
        { label: 'Sprints', icon: 'pi pi-calendar', routerLink: 'sprints' }
      ]
    }
  ];

  isAdminMenuOpen: boolean = true;

  isActive(routerLink: string) {
    return this.router.url.includes(routerLink);
  }
}
