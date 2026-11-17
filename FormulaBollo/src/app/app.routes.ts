import { Routes } from '@angular/router';
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
    component: HomeComponent
  },
  {
    path: 'drivers',
    loadComponent: () => import('./components/drivers/drivers.component').then(m => m.DriversComponent)
  },
  {
    path: 'drivers/:name',
    loadComponent: () => import('./components/drivers/drivers-info/drivers-info.component').then(m => m.DriversInfoComponent)
  },
  {
    path: 'teams',
    loadComponent: () => import('./components/teams/teams.component').then(m => m.TeamsComponent)
  },
  {
    path: 'teams/:name',
    loadComponent: () => import('./components/teams/teams-info/teams-info.component').then(m => m.TeamsInfoComponent)
  },
  {
    path: 'results',
    loadComponent: () => import('./components/races/races.component').then(m => m.RacesComponent)
  },
  {
    path: 'results/:name/:season',
    loadComponent: () => import('./components/results/results.component').then(m => m.ResultsComponent)
  },
  {
    path: 'statute',
    loadComponent: () => import('./components/statute/statute.component').then(m => m.StatuteComponent)
  },
  {
    path: 'statistics',
    loadComponent: () => import('./components/statistics/statistics.component').then(m => m.StatisticsComponent)
  },
  {
    path: 'admin',
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
        path: "sprints",
        loadComponent: () => import('./components/admin/admin-results/admin-results.component').then(m => m.AdminResultsComponent),
      }
    ],
  },
  {
    path: 'fantasy',
    loadComponent: () => import('./components/fantasy/fantasy.component').then(m => m.FantasyComponent)
  },
  {
    path: 'fantasy/login',
    loadComponent: () => import('./components/fantasy/fantasy-login/fantasy-login.component').then(m => m.FantasyLoginComponent),
    canActivate: [loginGuard]
  },
  {
    path: 'fantasy/register',
    loadComponent: () => import('./components/fantasy/fantasy-register/fantasy-register.component').then(m => m.FantasyRegisterComponent)
  },
  {
    path: "fantasy/recoverPassword/:token",
    loadComponent: () => import('./components/fantasy/fantasy-recover-password/fantasy-recover-password.component').then(m => m.FantasyRecoverPasswordComponent),
    canActivate: [recoverPasswordGuard]
  },
  {
    path: "fantasy/clasification",
    loadComponent: () => import('./components/fantasy/fantasy-clasification/fantasy-clasification.component').then(m => m.FantasyClasificationComponent)
  },
  {
    path: "fantasy/team",
    loadComponent: () => import('./components/fantasy/fantasy-team/fantasy-team.component').then(m => m.FantasyTeamComponent),
    canActivate: [fantasyTeamGuard]
  }
];
