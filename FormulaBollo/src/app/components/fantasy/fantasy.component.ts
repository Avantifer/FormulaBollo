import { Component, inject } from '@angular/core';
import { ImageService } from '../../../shared/services/image.service';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-fantasy',
  imports: [NgOptimizedImage],
  templateUrl: './fantasy.component.html',
  styleUrl: './fantasy.component.scss'
})
export class FantasyComponent {
  protected readonly imageService: ImageService = inject(ImageService);
  readonly router: Router = inject(Router);

  readonly howToPlayList: MenuItem[] = [
    {
      title: 'Crea tu equipo',
      label: 'Escoge tu equipo favorito de 3 pilotos y 2 escuderías, manteniéndote debajo del presupuesto ficticio de 70 millones. Los tendrás que rellenar por cada temporada. El equipo NO se guarda automáticamente, se tendrá que guardar y crear cada jornada. Puedes guardar el equipo hasta 12 horas antes de la carrera, después no dejará.',
      badge: 'fantasy/fantasyHowToPlay1.avif',
      target: 'fantasyComoJugar1',
      styleClass: 'flex-col lg:flex-row',
      fragment: 'bg-gray-50 dark:bg-gray-800'
    },
    {
      title: 'Precios dinámicos',
      label: 'Los precios van cambiando cada jornada dependiendo del rendimiento del jugador en la carrera. De esta manera vas a poder variar tu equipo y analizar cuál puede ser el mejor equipo para la jornada que viene. Al igual también va cambiando el precio de los equipos teniendo en cuenta los pilotos de la escudería en específico.',
      badge: 'fantasy/fantasyHowToPlay2.avif',
      target: 'fantasyComoJugar2',
      styleClass: 'flex-col-reverse lg:flex-row-reverse',
      fragment: 'bg-gray-200 dark:bg-gray-700'
    },
    {
      title: 'Sistema de puntuación',
      label: 'Los puntos de los pilotos se definirán dependiendo de su rendimiento en la carrera. Cuanto más arriba quede el piloto más puntos obtendrán al igual que si tiene la vuelta rápida o haya obtenido una pole. No obtendrá puntos si consiguió hacer un DNF o si ni siquiera participó.',
      badge: 'fantasy/fantasyHowToPlay3.avif',
      target: 'fantasyComoJugar3',
      styleClass: 'flex-col lg:flex-row',
      fragment: 'bg-gray-50 dark:bg-gray-800'
    },
    {
      title: 'Clasificación',
      label: 'Compite con tus amigos o compañeros de F1 Bollo para ver quién es el mejor jugador del Fantasy Bollo. Todos estarán en la misma liga y aunque no juegues al F1 Bollo puedes seguir jugando al Fantasy Bollo y estar pendiente de la competición. También podrás ver el equipo que escogieron para obtener inspiración.',
      badge: 'fantasy/fantasyHowToPlay4.avif',
      target: 'fantasyComoJugar4',
      styleClass: 'flex-col-reverse lg:flex-row-reverse',
      fragment: 'bg-gray-200 dark:bg-gray-700'
    }
  ];

  readonly adventureFantasy: MenuItem[] = [
    {
      label: 'Selecciona tus pilotos y escuderías favoritos',
      title: 'Tu Equipo',
      icon: 'pi pi-user',
      badge: 'pi pi-dollar',
      fragment: 'Presupuesto: $70M',
      routerLink: '/fantasy/team'
    },
    {
      label: 'Compite contra otros usuarios',
      title: 'Clasificación',
      icon: 'pi pi-trophy',
      badge: 'pi pi-flag',
      fragment: 'Liga F1 Bollo',
      routerLink: 'fantasy/clasification'
    },
    {
      label: 'Accede a tu cuenta Fantasy',
      title: 'Iniciar Sesión',
      icon: 'pi pi-sign-in',
      badge: 'pi pi-users',
      fragment: '¿Nuevo? Regístrate',
      routerLink: 'fantasy/login'
    }
  ];
}
