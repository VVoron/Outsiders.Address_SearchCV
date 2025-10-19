import { Injectable } from '@angular/core';

const ACCESS_KEY = 'auth_access';
const REFRESH_KEY = 'auth_refresh';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  setTokens(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  }

  get access(): string | null { return localStorage.getItem(ACCESS_KEY); }
  get refresh(): string | null { return localStorage.getItem(REFRESH_KEY); }

  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  get isLoggedIn(): boolean { return !!this.access; }

  get hasValidAccess(): boolean {
    const t = this.access;
    if (!t) return false;
    try {
      const payload = JSON.parse(atob(t.split('.')[1])) as { exp?: number };
      if (!payload?.exp) return true;
      return Math.floor(Date.now() / 1000) < payload.exp;
    } catch {
      return false;
    }
  }
}
