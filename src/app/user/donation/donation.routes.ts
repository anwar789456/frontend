import { Routes } from '@angular/router';

export const DONATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/donations.component').then(m => m.DonationsComponent)
  }
];
