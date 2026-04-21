import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../auth/token.service';

/** Allows navigation only when a token exists; otherwise redirects to /auth/login. */
export const authGuard: CanActivateFn = () => {
  const token  = inject(TokenService);
  const router = inject(Router);
  return token.hasToken() ? true : router.createUrlTree(['/auth/login']);
};

/** Allows navigation only when NO token exists; otherwise redirects to /dashboard. */
export const noAuthGuard: CanActivateFn = () => {
  const token  = inject(TokenService);
  const router = inject(Router);
  return !token.hasToken() ? true : router.createUrlTree(['/dashboard']);
};
