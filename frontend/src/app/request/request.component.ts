import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-request',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './request.component.html',
  styleUrl: './request.component.scss'
})
export class RequestComponent {
  activeTab: 'photo' | 'coords' = 'photo'; // пока только фото
  photos: { file: File; url: string }[] = [];
  isUploading = false;
  errorMessage = '';

  constructor(private http: HttpClient) {}

  onFileChange(event: any) {
    const files: FileList = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      this.photos.push({ file, url });
    }
  }

  removePhoto(index: number) {
    this.photos.splice(index, 1);
  }

  submit() {
    if (this.photos.length === 0) {
      this.errorMessage = 'Не выбрано ни одной фотографии';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';

    const formData = new FormData();
    this.photos.forEach((p, i) => {
      formData.append('image', p.file, p.file.name); 
    });

    const token = localStorage.getItem('access');

    this.http.post('/api/upload-images/', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: (res) => {
        this.isUploading = false;
        console.log('Ответ от API:', res);
        // alert('Фотографии успешно отправлены');  
        this.photos = []; // очистим список после отправки
      },
      error: (err) => {
        this.isUploading = false;
        this.errorMessage = 'Ошибка при загрузке файлов';
        console.error(err);
      }
    });
  }
}
