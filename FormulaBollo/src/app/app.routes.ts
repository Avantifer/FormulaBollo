import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { DriversComponent } from './components/drivers/drivers.component';
import { DriversInfoComponent } from './components/drivers/drivers-info/drivers-info.component';
import { TeamsComponent } from './components/teams/teams.component';
import { TeamsInfoComponent } from './components/teams/teams-info/teams-info.component';
import { StatuteComponent } from './components/statute/statute.component';
import { RacesComponent } from './components/races/races.component';
import { ResultsComponent } from './components/results/results.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { AdminComponent } from './components/admin/admin.component';
import { AdminGuard } from '../shared/guards/AdminGuard';
import { AdminResultsComponent } from './components/admin/admin-results/admin-results.component';
import { AdminPenaltiesComponent } from './components/admin/admin-penalties/admin-penalties.component';
import { FantasyComponent } from './components/fantasy/fantasy.component';
import { FantasyLoginComponent } from './components/fantasy/fantasy-login/fantasy-login.component';
import { FantasyRegisterComponent } from './components/fantasy/fantasy-register/fantasy-register.component';
import { LoginGuard } from '../shared/guards/LoginGuard';
import { FantasyRecoverPasswordComponent } from './components/fantasy/fantasy-recover-password/fantasy-recover-password.component';
import { RecoverPasswordGuard } from '../shared/guards/RecoverPasswordGuard';
import { FantasyClasificationComponent } from './components/fantasy/fantasy-clasification/fantasy-clasification.component';
import { FantasyTeamComponent } from './components/fantasy/fantasy-team/fantasy-team.component';
import { FantasyTeamGuard } from '../shared/guards/FantasyTeamGuard';

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
    component: DriversComponent
  },
  {
    path: 'drivers/:name',
    component: DriversInfoComponent
  },
  {
    path: 'teams',
    component: TeamsComponent
  },
  {
    path: 'teams/:name',
    component: TeamsInfoComponent
  },
  {
    path: 'results',
    component: RacesComponent
  },
  {
    path: 'results/:name/:season',
    component: ResultsComponent
  },
  {
    path: 'statute',
    component: StatuteComponent
  },
  {
    path: 'statistics',
    component: StatisticsComponent
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AdminGuard],
    children: [
      { 
        path: '',
        redirectTo: 'results',
        pathMatch: 'full' 
      },
      {
        path: "results",
        component: AdminResultsComponent,
      },
      {
        path: "penalties",
        component: AdminPenaltiesComponent,
      },
      {
        path: "sprints",
        component: AdminResultsComponent,
      }
    ],
  },
  {
    path: 'fantasy',
    component: FantasyComponent
  },
  {
    path: 'fantasy/login',
    component: FantasyLoginComponent,
    canActivate: [LoginGuard]
  },
  {
    path: 'fantasy/register',
    component: FantasyRegisterComponent
  },
  {
    path: "fantasy/recoverPassword/:token",
    component: FantasyRecoverPasswordComponent,
    canActivate: [RecoverPasswordGuard]
  },
  {
    path: "fantasy/clasification",
    component: FantasyClasificationComponent
  },
  {
    path: "fantasy/team",
    component: FantasyTeamComponent,
    canActivate: [FantasyTeamGuard]
  }
];
