import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../auth/token.service';

/** Attaches the Bearer token to every outgoing HTTP request. */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenService).getAccess();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
