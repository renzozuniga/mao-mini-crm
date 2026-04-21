import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/auth/register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        data: { animation: 'dashboard' },
      },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./pages/contacts/contacts.component').then(m => m.ContactsComponent),
        data: { animation: 'contacts' },
      },
      {
        path: 'pipeline',
        loadComponent: () =>
          import('./pages/pipeline/pipeline.component').then(m => m.PipelineComponent),
        data: { animation: 'pipeline' },
      },
      {
        path: 'activities',
        loadComponent: () =>
          import('./pages/activities/activities.component').then(m => m.ActivitiesComponent),
        data: { animation: 'activities' },
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
