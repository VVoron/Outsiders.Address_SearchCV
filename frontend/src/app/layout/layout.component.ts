import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd, Event } from '@angular/router';
import { AuthService } from '../auth.service'; 
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit {
  usernameFirstLetter = '';
  activePage: 'request' | 'recognition' | 'admin' | null = null;

  showMenu = false; //флаг для меню

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.auth.me().subscribe({
      next: (res: any) => {
        if (res?.username) {
          this.usernameFirstLetter = res.username.charAt(0).toUpperCase();
        }
      },
      error: () => {
        this.usernameFirstLetter = '?';
      }
    });

    this.router.events
      .pipe(filter((e: Event): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        if (e.url.startsWith('/request')) {
          this.activePage = 'request';
        } else if (e.url.startsWith('/recognition')) {
          this.activePage = 'recognition';
        }
        else if (e.url.startsWith('/admin')) {
          this.activePage = 'admin';
        }
         else {
          this.activePage = null;
        }
      });
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;
  }

  logout() {
    const refresh = localStorage.getItem('refresh');
    if (refresh) {
      this.auth.logout(refresh).subscribe({
        next: () => {
          localStorage.clear();
          location.href = '/login';
        },
        error: () => {
          localStorage.clear();
          location.href = '/login';
        }
      });
    } else {
      localStorage.clear();
      location.href = '/login';
    }
  }
}

