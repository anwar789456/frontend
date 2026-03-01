import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./pages/events/events.component').then(m => m.AdminEventsComponent)
      },
      {
        path: 'sessions',
        loadComponent: () => import('./pages/sessions/sessions.component').then(m => m.AdminSessionsComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'donations',
        loadComponent: () => import('./pages/donations/donations.component').then(m => m.DonationsComponent)
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('./pages/subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent)
      },
      {
        path: 'forums',
        loadComponent: () => import('./pages/forums/forum-reports.component').then(m => m.AdminForumReportsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  }
];
