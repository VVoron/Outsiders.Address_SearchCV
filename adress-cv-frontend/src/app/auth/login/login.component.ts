import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  serverError = '';

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    this.serverError = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.auth.login(this.form.getRawValue() as any).subscribe({
      next: () => { this.loading = false; this.router.navigateByUrl('/'); },
      error: (err) => { this.loading = false; this.serverError = this.humanizeError(err); }
    });
  }

  private humanizeError(err: any): string {
    if (err?.status === 401 || err?.status === 400) return 'Неверный логин или пароль.';
    return 'Ошибка авторизации. Повторите попытку.';
  }
}