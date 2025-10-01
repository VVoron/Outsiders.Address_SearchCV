import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ImageCropperComponent],
  templateUrl: './upload-modal.component.html',
  styleUrl: './upload-modal.component.scss'
})
export class UploadModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() uploaded = new EventEmitter<any>(); // теперь эмитим ответ API

  imageChangedEvent: any = '';
  croppedImage: string | null = null;
  originalFile: File | null = null;
  errorMessage = '';
  isUploading = false;

  constructor(private http: HttpClient) {}

  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Допустимые форматы: JPG, JPEG, PNG';
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (
        img.naturalWidth < 640 || img.naturalHeight < 420 ||
        img.naturalWidth > 5500 || img.naturalHeight > 3500
      ) {
        this.errorMessage = 'Размер изображения должен быть от 640x420 до 5500x3500';
      } else {
        this.errorMessage = '';
        this.imageChangedEvent = event;
        this.originalFile = file; // сохраняем оригинал
      }
    };
    img.src = URL.createObjectURL(file);
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = event.base64 ?? null;
  }

  submit() {
    if (!this.originalFile && !this.croppedImage) {
      this.errorMessage = 'Файл не выбран';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';

    const formData = new FormData();

    if (this.croppedImage) {
      // если есть обрезка — используем её
      fetch(this.croppedImage)
        .then(res => res.blob())
        .then(blob => {
          formData.append('image', blob, this.originalFile?.name || 'upload.png');
          this.sendRequest(formData);
        });
    } else if (this.originalFile) {
      // если обрезки нет — отправляем оригинал
      formData.append('image', this.originalFile, this.originalFile.name);
      this.sendRequest(formData);
    }
  }

  private sendRequest(formData: FormData) {
    const token = localStorage.getItem('access');

    this.http.post('/api/upload-images/', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.uploaded.emit(res); // наружу отдаём ответ API
        this.close.emit();
      },
      error: (err) => {
        this.isUploading = false;
        this.errorMessage = 'Ошибка при загрузке файла';
        console.error(err);
      }
    });
  }
}
