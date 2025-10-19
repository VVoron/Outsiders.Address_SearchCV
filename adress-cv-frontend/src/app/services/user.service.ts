import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';
import { map, Observable } from 'rxjs';
import { UserDto } from '../data-models/userDto';
import { ApiUserResponse } from '../auth/auth.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

    private mapOne = (x: ApiUserResponse): UserDto => {
    return {
      id: x.id,
      email: x.email,
      name: x.username,
      role: x.is_superuser === true ? 'Админ' : 'Обычный пользователь'
    };
  };

  list(page = 1, pageSize = 100): Observable<{ data: UserDto[] }> {
    const url = `${environment.API_BASE}/users/?page=${page}&page_size=${pageSize}`;

    return this.http
      .get<{
        count: number
        results: ApiUserResponse[];
      }>(url)
      .pipe(
        map((resp) => ({
          data: resp.results.map(this.mapOne)
        }))
      );
  }
}
