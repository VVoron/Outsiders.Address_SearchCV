import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { TokenStorageService } from './token-storage.service';
import { AuthService } from './auth.service';
import { catchError, map, of } from 'rxjs';

function toUrl(segments: UrlSegment[]) {
  const url = '/' + segments.map(s => s.path).join('/');
  return url === '/' ? '/profile' : url; // дефолт
}

// Защищает все внутренние роуты. Если access просрочен, попробуем refresh.
export const authRequired: CanMatchFn = (route, segments) => {
  const store = inject(TokenStorageService);
  const auth  = inject(AuthService);
  const router = inject(Router);
  const target = toUrl(segments);

  if (store.hasValidAccess) return true;

  if (store.refresh) {
    return auth.refresh().pipe(
      map(() => true),
      catchError(() => of(router.createUrlTree(['/login'], { queryParams: { returnUrl: target } })))
    );
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: target } });
};

// Не пускает на /login и /register если уже авторизован
export const redirectIfAuth: CanMatchFn = () => {
  const store = inject(TokenStorageService);
  const router = inject(Router);
  return store.hasValidAccess ? router.createUrlTree(['/map']) : true;
};
