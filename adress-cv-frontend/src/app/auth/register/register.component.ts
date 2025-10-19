import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

function matchPasswords(ctrl: AbstractControl): ValidationErrors | null {
  const pass = ctrl.get('password')?.value;
  const rep  = ctrl.get('re_password')?.value;
  return pass && rep && pass !== rep ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
})
export class RegisterComponent {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private router = inject(Router);

  loading = false;
  serverError = '';
  success = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    re_password: ['', [Validators.required]],
  }, { validators: matchPasswords });

  submit() {
    this.serverError = '';
    this.success = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.auth.register(this.form.getRawValue() as any).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigateByUrl('/login'), 1000);
      },
      error: (err) => {
        this.loading = false;
        this.serverError = this.humanizeError(err);
      },
    });
  }

  get mismatch() {
    return this.form.errors?.['mismatch']
      && (this.form.get('re_password')?.touched || this.form.get('password')?.touched);
  }

  private humanizeError(err: any): string {
    // if (err?.status === 400) return 'Проверьте корректность полей (возможно, такой логин уже существует).';
    return '';
  }
}