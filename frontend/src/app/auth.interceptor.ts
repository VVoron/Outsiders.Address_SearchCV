import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
0
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
  const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh') : null;
  const router = inject(Router);

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((err) => {
      if (err.status === 401) {
          console.log('401');
          localStorage.clear();
          router.navigate(['/login']);
      
      }
      return throwError(() => err);
    })
  );
};
