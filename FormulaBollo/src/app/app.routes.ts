import { Routes } from '@angular/router';
import { nameTitleResolver, resultsTitleResolver } from '../shared/services/page-title.strategy';
import { HomeComponent } from './components/home/home.component';
import { adminGuard } from '../shared/guards/AdminGuard';
import { loginGuard } from '../shared/guards/LoginGuard';
import { recoverPasswordGuard } from '../shared/guards/RecoverPasswordGuard';
import { fantasyTeamGuard } from '../shared/guards/FantasyTeamGuard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home', 
    title: 'Inicio',
    component: HomeComponent
  },
  {
    path: 'drivers',
    title: 'Pilotos',
    data: { preload: true },
    loadComponent: () => import('./components/drivers/drivers.component').then(m => m.DriversComponent)
  },
  {
    path: 'drivers/:name',
    title: nameTitleResolver,
    data: { preload: true },
    loadComponent: () => import('./components/drivers/drivers-info/drivers-info.component').then(m => m.DriversInfoComponent)
  },
  {
    path: 'teams',
    title: 'Escuderías',
    data: { preload: true },
    loadComponent: () => import('./components/teams/teams.component').then(m => m.TeamsComponent)
  },
  {
    path: 'teams/:name',
    title: nameTitleResolver,
    data: { preload: true },
    loadComponent: () => import('./components/teams/teams-info/teams-info.component').then(m => m.TeamsInfoComponent)
  },
  {
    path: 'results',
    title: 'Resultados',
    data: { preload: true },
    loadComponent: () => import('./components/races/races.component').then(m => m.RacesComponent)
  },
  {
    path: 'results/:name/:season',
    title: resultsTitleResolver,
    data: { preload: true },
    loadComponent: () => import('./components/results/results.component').then(m => m.ResultsComponent)
  },
  {
    path: 'statute',
    title: 'Estatuto',
    data: { preload: true },
    loadComponent: () => import('./components/statute/statute.component').then(m => m.StatuteComponent)
  },
  {
    path: 'statistics',
    title: 'Estadísticas',
    data: { preload: true },
    loadComponent: () => import('./components/statistics/statistics.component').then(m => m.StatisticsComponent)
  },
  {
    path: 'admin',
    title: 'Administración',
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard],
    children: [
      { 
        path: '',
        redirectTo: 'results',
        pathMatch: 'full' 
      },
      {
        path: "results",
        loadComponent: () => import('./components/admin/admin-results/admin-results.component').then(m => m.AdminResultsComponent),
      },
      {
        path: "penalties",
        loadComponent: () => import('./components/admin/admin-penalties/admin-penalties.component').then(m => m.AdminPenaltiesComponent),
      },
      {
        path: 'prices',
        title: 'Precios Fantasy',
        loadComponent: () => import('./components/admin/admin-prices/admin-prices.component').then(m => m.AdminPricesComponent),
      },
      {
        path: "sprints",
        loadComponent: () => import('./components/admin/admin-results/admin-results.component').then(m => m.AdminResultsComponent),
      }
    ],
  },
  {
    path: 'fantasy',
    title: 'Fantasy',
    loadComponent: () => import('./components/fantasy/fantasy.component').then(m => m.FantasyComponent)
  },
  {
    path: 'fantasy/login',
    title: 'Iniciar sesión',
    loadComponent: () => import('./components/fantasy/fantasy-login/fantasy-login.component').then(m => m.FantasyLoginComponent),
    canActivate: [loginGuard]
  },
  {
    path: 'fantasy/register',
    title: 'Registro',
    loadComponent: () => import('./components/fantasy/fantasy-register/fantasy-register.component').then(m => m.FantasyRegisterComponent)
  },
  {
    path: "fantasy/recoverPassword/:token",
    title: 'Recuperar contraseña',
    loadComponent: () => import('./components/fantasy/fantasy-recover-password/fantasy-recover-password.component').then(m => m.FantasyRecoverPasswordComponent),
    canActivate: [recoverPasswordGuard]
  },
  {
    path: "fantasy/clasification",
    title: 'Clasificación Fantasy',
    loadComponent: () => import('./components/fantasy/fantasy-clasification/fantasy-clasification.component').then(m => m.FantasyClasificationComponent)
  },
  {
    path: "fantasy/team",
    title: 'Tu equipo',
    loadComponent: () => import('./components/fantasy/fantasy-team/fantasy-team.component').then(m => m.FantasyTeamComponent),
    canActivate: [fantasyTeamGuard]
  },
  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
