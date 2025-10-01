import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.errorMessage = '';

    this.auth.login(this.username, this.password).subscribe({
      next: (res: any) => {
        if (res?.access) {
          localStorage.setItem('access', res.access);
          localStorage.setItem('refresh', res.refresh);

          this.auth.me().subscribe({
            next: (user) => {
                console.log('Пользователь подтверждён:', user);
                this.router.navigate(['/recognition']);
            },
            error: () => {
              console.error('Токен невалиден');
              localStorage.clear();
              this.router.navigate(['/login']);
            }
          });
        
        } else {
          this.errorMessage = 'Неверный логин или пароль';
        }
      },
      error: (err) => {
        console.error('Ошибка авторизации', err);
        this.errorMessage = 'Ошибка при авторизации';
      }
    });
  }
}
