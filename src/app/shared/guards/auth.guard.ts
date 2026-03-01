import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn) {
      router.navigate(['/login']);
      return false;
    }

    if (allowedRoles.includes(authService.userRole)) {
      return true;
    }

    const redirectUrl = authService.getRedirectUrlForRole(authService.userRole);
    router.navigate([redirectUrl]);
    return false;
  };
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn) {
    return true;
  }

  const redirectUrl = authService.getRedirectUrlForRole(authService.userRole);
  router.navigate([redirectUrl]);
  return false;
};
