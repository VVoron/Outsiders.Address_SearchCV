import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ApiUserResponse } from '../auth/auth.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-menu',
  templateUrl: 'nav-menu.html',
  styleUrl: 'nav-menu.scss',
  imports: [RouterLink, RouterLinkActive, CommonModule]
})
export class NavMenu implements OnInit {
  userName: string = '';
  isAdmin: boolean = false;

  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.auth.me().subscribe((res: ApiUserResponse) => {
      this.userName = res.username;
      this.isAdmin = res.is_superuser ?? false;
    });
  }

  get currentUserName(){
    return this.auth.userName ?? this.userName;
  }

  onLogout(event: Event) {
    event.preventDefault();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
