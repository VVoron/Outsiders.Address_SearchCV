import {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';
import { AuthService } from './auth.service';

// Глобальные флаги, чтобы шарить состояние между запросами
let refreshInProgress = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

function bypass(url: string): boolean {
  return /\/api\/auth\/(jwt\/create|jwt\/refresh|users\/?$)/.test(url);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(TokenStorageService);
  const auth = inject(AuthService);

  const shouldBypass = bypass(req.url);
  const token = store.access;

  const authReq = (!shouldBypass && token)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || shouldBypass) {
        return throwError(() => err);
      }

      if (!store.refresh) {
        store.clear();
        return throwError(() => err);
      }

      if (!refreshInProgress) {
        refreshInProgress = true;
        refreshSubject.next(null);

        return auth.refresh().pipe(
          switchMap(res => {
            refreshInProgress = false;
            refreshSubject.next(res.access);
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${res.access}` } });
            return next(retried);
          }),
          catchError(refreshErr => {
            refreshInProgress = false;
            store.clear();
            refreshSubject.next(null);
            return throwError(() => refreshErr);
          })
        );
      }

      // Если рефреш уже идёт — ждём его завершения
      return refreshSubject.pipe(
        filter(t => t !== null),
        take(1),
        switchMap((newAccess) => {
          const retried = req.clone({ setHeaders: { Authorization: `Bearer ${newAccess}` } });
          return next(retried);
        })
      );
    })
  );
};
