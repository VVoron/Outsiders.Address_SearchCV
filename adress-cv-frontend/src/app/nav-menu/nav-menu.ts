import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-nav-menu',
  templateUrl: 'nav-menu.html',
  styleUrl: 'nav-menu.scss',
  imports: [RouterLink, RouterLinkActive]
})
export class NavMenu {
  userName: string = "Admin"

  private auth = inject(AuthService);
  private router = inject(Router);

  onLogout(event: Event) {
    event.preventDefault();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
