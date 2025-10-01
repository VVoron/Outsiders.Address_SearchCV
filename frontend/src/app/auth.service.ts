import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}


  register(username: string, password: string, re_password: string): Observable<any> {
    return this.http.post('/auth/users/', { username, password, re_password });
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post('/auth/jwt/create/', { username, password });
  }

  refreshToken(refresh: string): Observable<any> {
    return this.http.post('auth/jwt/refresh/', { refresh });
  }

  logout(refresh: string): Observable<any> {
    return this.http.post('/auth/jwt/logout/', { refresh });
  }

  me() {
    const token = localStorage.getItem('access');
    return this.http.get('/auth/me/', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }


}
