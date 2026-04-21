import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '../auth/token.service';

/** Clears tokens and redirects to login on 401 responses. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token  = inject(TokenService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        token.clear();
        router.navigate(['/auth/login']);
      }
      return throwError(() => err);
    })
  );
};
