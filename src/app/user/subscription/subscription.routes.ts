import { Routes } from '@angular/router';

export const SUBSCRIPTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/subscriptions.component').then(m => m.SubscriptionsComponent)
  },
  {
    path: 'payment-success',
    loadComponent: () => import('./pages/payment-success.component').then(m => m.PaymentSuccessComponent)
  },
  {
    path: 'payment-cancel',
    loadComponent: () => import('./pages/payment-cancel.component').then(m => m.PaymentCancelComponent)
  },
  {
    path: 'billing-history',
    loadComponent: () => import('./pages/billing-history/billing-history.component').then(m => m.BillingHistoryComponent)
  }
];
