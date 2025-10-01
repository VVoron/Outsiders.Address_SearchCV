import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-create-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-user-modal.component.html',
  styleUrls: ['./create-user-modal.component.scss']
})
export class CreateUserModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() userCreated = new EventEmitter<any>();

  username = '';
  password = '';
  re_password = '';
  errorMessage = '';

  constructor(private auth: AuthService) {}

  submit() {
    this.errorMessage = '';
    this.auth.register(this.username, this.password, this.re_password).subscribe({
      next: (res: any) => {
        this.userCreated.emit(res);
      },
      error: () => {
        this.errorMessage = 'Ошибка при создании пользователя';
      }
    });
  }
}
