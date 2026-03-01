import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard, guestGuard, roleGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./user/user/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./user/user/pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'admin',
    canActivate: [roleGuard(['ADMIN'])],
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: 'tutor',
    canActivate: [roleGuard(['TUTEUR'])],
    loadChildren: () => import('./tutor/tutor.routes').then(m => m.TUTOR_ROUTES)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'courses', pathMatch: 'full' },
      {
        path: 'courses',
        loadChildren: () => import('./user/course/course.routes').then(m => m.COURSE_ROUTES)
      },
      {
        path: 'friends',
        loadChildren: () => import('./user/friends/friends.routes').then(m => m.FRIENDS_ROUTES)
      },
      {
        path: 'sessions',
        loadChildren: () => import('./user/sessionreservation/sessionreservation.routes').then(m => m.SESSION_ROUTES)
      },
      {
        path: 'quiz',
        loadChildren: () => import('./user/quiz/quiz.routes').then(m => m.QUIZ_ROUTES)
      },
      {
        path: 'forums',
        loadChildren: () => import('./user/forum/forum.routes').then(m => m.FORUM_ROUTES)
      },
      {
        path: 'events',
        loadChildren: () => import('./user/event/event.routes').then(m => m.EVENT_ROUTES)
      },
      {
        path: 'profile',
        loadChildren: () => import('./user/user/user.routes').then(m => m.USER_ROUTES)
      },
      {
        path: 'donations',
        loadChildren: () => import('./user/donation/donation.routes').then(m => m.DONATION_ROUTES)
      },
      {
        path: 'subscriptions',
        loadChildren: () => import('./user/subscription/subscription.routes').then(m => m.SUBSCRIPTION_ROUTES)
      }
    ]
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./user/user/pages/forgetpassword/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./user/user/pages/forgetpassword/reset-password.component')
        .then(m => m.ResetPasswordComponent)
  },

  { path: '**', redirectTo: 'login' }
];
