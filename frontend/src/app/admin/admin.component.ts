import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface UserRow {
  id: number;
  username: string;
  role: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  data: UserRow[] = [];

  currentPage = 1;
  pageSize = 5;
  lastPage = 1;
  total = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadPage(1);
  }

  loadPage(page: number) {
    const token = localStorage.getItem('access');
    this.http.get<any>(`api/users/?page=${page}&page_size=${this.pageSize}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe((res) => {
      this.total = res.count;
      this.currentPage = page;
      this.lastPage = Math.ceil(this.total / this.pageSize);

      this.data = res.results.map((u: any) => ({
        id: u.id,
        username: u.username,
        role: u.is_superuser ? 'Админ' : 'Обычный'
      }));
    });
  }
}
