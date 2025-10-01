import { HttpInterceptorFn } from '@angular/common/http';

export const apiPrefixInterceptor: HttpInterceptorFn = (req, next) => {
  // если URL уже абсолютный (http/https) — не трогаем
  if (/^https?:\/\//i.test(req.url)) {
    return next(req);
  }

  // если начинается с / — добавляем /api
  if (req.url.startsWith('/')) {
    return next(req.clone({ url: `/api${req.url}` }));
  }

  // если относительный без / — тоже добавляем
  return next(req.clone({ url: `/api/${req.url}` }));
};

