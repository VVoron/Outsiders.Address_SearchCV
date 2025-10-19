import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { LoginRequest, RegisterRequest, TokenResponse, ApiUserResponse } from './auth.models';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.API_BASE}/auth`;

  public userName = '';

  constructor(
    private http: HttpClient,
    private storage: TokenStorageService
  ) {}

  login(dto: LoginRequest): Observable<void> {
    return this.http.post<TokenResponse>(`${this.base}/jwt/create/`, dto).pipe(
      tap(res => this.storage.setTokens(res.access, res.refresh)),
      map(() => {
        this.userName = dto.username;
      })
    );
  }

  register(dto: RegisterRequest) {
    return this.http.post<{id: number; email: string; username: string}>(`${this.base}/users/`, dto);
  }

  refresh(): Observable<TokenResponse> {
    const refresh = this.storage.refresh;
    return this.http.post<TokenResponse>(`${this.base}/jwt/refresh/`, { refresh }).pipe(
      tap(res => {
        // если сервер вернул новый refresh — перезапишем
        this.storage.setTokens(res.access, res.refresh ?? undefined);
      })
    );
  }

  me(): Observable<ApiUserResponse> {
    return this.http.get<ApiUserResponse>(`${this.base}/me/`);
  }

  logout() {
    this.storage.clear();
  }
}
