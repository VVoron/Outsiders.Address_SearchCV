import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {
  username = '';
  password = '';
  re_password = '';
  errorMessage = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.errorMessage = '';
    this.loading = true;

    if (this.password !== this.re_password) {
      this.errorMessage = 'Пароли не совпадают';
      this.loading = false;
      return;
    }

    this.auth.register(this.username, this.password, this.re_password).subscribe({
      next: () => {
        // 👇 сразу логиним после регистрации
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
            }
          },
          error: () => {
            this.errorMessage = 'Ошибка при автоматическом входе';
          }
        });
      },
      error: (err) => {
        console.error('Ошибка регистрации', err);
        this.errorMessage = 'Ошибка при регистрации';
        this.loading = false;
      }
    });
  }
}
