import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadModalComponent } from '../upload-modal/upload-modal.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

interface RecognitionRow {
  id: number;
  date: string;
  photo_url: string;
  status: string;
  lat: number | null;
  lon: number | null;
  address?: string;
  selected?: boolean;
  preview_url?: string;   // превью
}

@Component({
  selector: 'app-recognition',
  standalone: true,
  imports: [CommonModule, UploadModalComponent, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './recognition.component.html',
  styleUrl: './recognition.component.scss'
})
export class RecognitionComponent implements OnInit {
  data: RecognitionRow[] = [];
  showModal = false;

  // Пагинация
  currentPage = 1;
  pageSize = 5;
  lastPage = 1;
  total = 0;

  selectedImage: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}


  handleFile(res: any) {
    console.log('Ответ от API:', res);
    this.showModal = false;
  }

  async getAddress(lat: number, lon: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const data = await res.json();
      return data.display_name || 'Адрес не найден';
    } catch {
      return 'Ошибка получения адреса';
    }
  }

  ngOnInit() {
    this.loadPage(1);
  }

  loadPage(page: number) {
    const token = localStorage.getItem('access');
    this.http
      .get<any>(`api/user/image-locations/?page=${page}&page_size=${this.pageSize}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .subscribe(async (res) => {
        this.currentPage = res.meta.current_page;
        this.lastPage = res.meta.last_page;
        this.total = res.meta.total;

        const rows: RecognitionRow[] = res.data.map((item: any) => ({
          id: item.id,
          date: new Date(item.created_at).toLocaleDateString('ru-RU'),
          status: item.status === 'done' ? 'Готово' : item.status,
          photo_url: item.image?.file_path || '',
          preview_url: item.image?.preview_url || '',
          lat: item.lat,
          lon: item.lon,
          selected: false,
        }));

        for (const row of rows) {
          if (row.lat && row.lon) {
            row.address = await this.getAddress(row.lat, row.lon);
          } else {
            row.address = '—';
          }
        }

        this.data = rows;
      });
  }

  firstSelectedQuery() {
    const first = this.data.find(d => d.selected && d.lat != null && d.lon != null);
    if (!first) return {};
    return { lat: first.lat, lon: first.lon };
  }

  allSelectedQuery() {
    const selected = this.data
      .filter(d => d.selected && d.lat != null && d.lon != null)
      .map(d => ({
        id: d.id,
        lat: d.lat,
        lon: d.lon,
        address: d.address
      }));

    if (!selected.length) return {};
    return { points: JSON.stringify(selected) }; // сериализуем в строку
  }

  goToMap() {
    const selected = this.data
      .filter(d => d.selected && d.lat != null && d.lon != null)
      .map(d => ({
        id: d.id,
        lat: d.lat,
        lon: d.lon,
        address: d.address
      }));

    if (selected.length) {
      this.router.navigate(['/map'], { state: { points: selected } });
    }
  }


  openImage(url: string) {
    this.selectedImage = url;
  }

  closeImage() {
    this.selectedImage = null;
  }

  deleteRow(id: number) {
    const token = localStorage.getItem('access');
    if (!confirm('Удалить запись №' + id + '?')) return;

    this.http.delete(`api/image-locations/${id}/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).subscribe({
      next: () => {
        // после удаления обновляем текущую страницу
        this.loadPage(this.currentPage);
      },
      error: (err) => {
        console.error('Ошибка при удалении', err);
        alert('Не удалось удалить запись');
      }
    });
  }

}
