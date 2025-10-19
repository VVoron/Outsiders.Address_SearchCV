import { Component, ElementRef, inject, TemplateRef, ViewChild } from '@angular/core';
import { ImageGridComponent } from "./image-grid/image-grid.component";
import { AddressDto, ImageDTO } from '../data-models/addressDto';
import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { BehaviorSubject, combineLatest, forkJoin } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { TextBoxModule } from '@progress/kendo-angular-inputs';
import { DatePickerModule } from '@progress/kendo-angular-dateinputs';
import { ImageLocationsService } from '../services/image-locations.service';
import { MapViewComponent } from "../map-view/map-view";
import { PhotoManagerComponent } from "./photo-manager/photo-manager.component";
import { MatDialog, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { GridDataResult, PageChangeEvent } from '@progress/kendo-angular-grid';
import JSZip from 'jszip';


@Component({
  selector: 'app-image-list',
  imports: [ImageGridComponent, TextBoxModule, DatePickerModule, AsyncPipe, MapViewComponent, MatDialogContent, MatDialogActions],
  templateUrl: './image-list.component.html',
  styleUrl: './image-list.component.scss'
})
export class ImageListComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('archiveInput') archiveInput!: ElementRef<HTMLInputElement>;

  @ViewChild('jsonDialog') jsonDialogTemplate!: TemplateRef<any>;
  @ViewChild('mapDialog') mapDialogTemplate!: TemplateRef<any>;
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;

  private api = inject(ImageLocationsService);

  rows: AddressDto[] = [];
  loading = false;
  error = '';

  selected: AddressDto[] = [];

  selectedArchive: File | null = null;
  selectedJson: File | null = null;

  textFilter = '';
  isTextFilterExpanded = false;

  dateRange = {
    from: null as Date | null,
    to: null as Date | null
  };
  isDateFilterExpanded = false;

  isLeftMenuOpened = false;
  isRightMenuOpened = false;

  pageSize = 10;
  skip = 0;
  currentPage = 1;
  total = 0;

  filteredData$ = new BehaviorSubject<AddressDto[]>([]);

  constructor(private dialog: MatDialog){}


  ngOnInit() {
    this.onRefresh();
  }


  onRefresh() {
    this.loading = true;
    this.api.list(this.currentPage, 1000000).subscribe({
      next: (res) => {
        this.rows = res.data;
        this.total = res.total ?? this.rows.length;
        this.skip = (this.currentPage - 1) * this.pageSize;
        this.applyFilters();
        this.loading = false;

        if (this.total > 0 && this.rows.length === 0 && this.currentPage > 1) {
          this.currentPage--;
          this.onRefresh();
        }
      },
      error: () => { this.error = 'Не удалось загрузить список изображений'; this.loading = false; }
    });
  }

  onPageChange(e: PageChangeEvent) {
    this.pageSize = e.take;
    this.skip = e.skip;
    this.currentPage = Math.floor(e.skip / e.take) + 1;
    this.onRefresh();
  }

  remove() {
    if (!this.selected.length) return;

    const toDelete = [...this.selected];
    const ids = toDelete.map(s => s.id);

    this.loading = true;

    forkJoin(ids.map(id => this.api.delete(id)))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          const del = new Set(ids);
          this.rows = this.rows.filter(r => !del.has(r.id));
          this.selected = [];
          this.applyFilters();

          this.onRefresh();
        },
        error: (err) => {
          console.error(err);
          this.error = 'Не удалось удалить некоторые записи';
        }
      });
  }

  openDialog() {
    console.log(this.selected);
    if (!this.selected.length) return;
    
    this.dialog.open(this.mapDialogTemplate, {
      disableClose: false,
      width: '90%',
      maxWidth: '1500px',
      autoFocus: false,
    });
  }

  toggleLeftMenu(){
    this.isLeftMenuOpened = !this.isLeftMenuOpened;
  }

  toggleRightMenu(){
    this.isRightMenuOpened = !this.isRightMenuOpened;
  }

  onTextFilterChange() {
    this.applyFilters();
  }

  clearTextFilter() {
    this.textFilter = '';
    this.applyFilters();
  }

  toggleDateFilter() { 
    this.isDateFilterExpanded = !this.isDateFilterExpanded;
   }

  onDateFilterChange() {
    this.applyFilters();
  }

  clearDateFilter() {
    this.dateRange = { from: null, to: null };
    this.applyFilters();
  }

  private applyFilters() {
    let result = this.rows;

    if (this.textFilter.trim()) {
      const term = this.textFilter.trim().toLowerCase();
      result = result.filter(item =>
        item.address.toLowerCase().includes(term) ||
        item.coordinates.toLowerCase().includes(term)
      );
    }

    if (this.dateRange.from || this.dateRange.to) {
      result = result.filter(item => {
        const upload = item.uploadDate;
        if (this.dateRange.from && upload < this.dateRange.from) return false;
        if (this.dateRange.to && upload > this.dateRange.to) return false;
        return true;
      });
    }

    this.filteredData$.next(result);
  }

  onGridSelection(sel: AddressDto[]) {
    this.selected = sel;
  }

  isEmptyFilters(){
    return !this.textFilter && !this.dateRange.from && !this.dateRange.to;
  }

  openPhotoDialog(){
    this.fileInput.nativeElement.click();
  }

  async exportPhotos(): Promise<void> {
    // берём выбранные, иначе все отфильтрованные, иначе все строки
    const pool = this.selected.length
      ? this.selected
      : (this.filteredData$.value?.length ? this.filteredData$.value : this.rows);

    if (!pool.length) {
      alert('Нет данных для выгрузки');
      return;
    }

    const zip = new JSZip();
    const filenames = new Set<string>();

    const makeName = (base: string, fallback: string) => {
      const raw = (base || fallback || 'image').split('?')[0];
      const name = raw.split('/').pop() || 'image';
      // гарантируем уникальность имён
      let final = name;
      let i = 1;
      while (filenames.has(final)) {
        const dot = name.lastIndexOf('.');
        final = dot > 0 ? `${name.slice(0, dot)}_${i}${name.slice(dot)}` : `${name}_${i}`;
        i++;
      }
      filenames.add(final);
      return final;
    };

    type Job = { url: string; name: string };
    const jobs: Job[] = [];

    for (const row of pool) {
      // основное фото
      if (row.photoUrl) {
        jobs.push({
          url: row.photoUrl,
          name: makeName(row.imageFilename || '', `main_${row.id}.jpg`),
        });
      }
      // мусорные фото
      for (const t of (row.trashImages ?? [])) {
        const url = t.photoUrl;
        if (!url) continue;
        const fallback = t.photoUrl || `trash_${row.id}_${t.id}.jpg`;
        jobs.push({ url, name: makeName(t.photoUrl || url, fallback) });
      }
    }

    if (!jobs.length) {
      alert('Не найдено ни одной фотографии для выгрузки');
      return;
    }

    // качаем с ограничением параллелизма (чтобы не DDoS-ить сервер)
    const CONCURRENCY = 4;
    const fetchAndAdd = async (job: Job) => {
      try {
        const res = await fetch(job.url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ab = await (await res.blob()).arrayBuffer();
        zip.file(job.name, ab);
      } catch (e) {
        console.error('Не удалось скачать', job.url, e);
        // добавим в zip "плейсхолдер" со ссылкой, чтобы ничего не потерять
        zip.file(job.name + '.txt', `Не удалось скачать файл.\nURL: ${job.url}\nОшибка: ${(e as Error).message}`);
      }
    };

    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      await Promise.all(jobs.slice(i, i + CONCURRENCY).map(fetchAndAdd));
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `photos_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.zip`;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  onPhotoFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);

    const ref = this.dialog.open(PhotoManagerComponent, {
      width: '90%',
      height: '90%',
      maxWidth: '1200px',
      data: { files },
      autoFocus: false,
      restoreFocus: false
    });

    ref.afterClosed().subscribe((res: { uploaded?: ImageDTO[] } | undefined) => {
      this.applyFilters();
      this.onRefresh();
    });

    input.value = '';
  }


  openArchiveDialog() {
    this.archiveInput.nativeElement.click();
  }

  onArchiveSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.selectedArchive = input.files[0];
    this.openJsonDialog();
    input.value = '';
  }

  openJsonDialog() {
    const dialogRef = this.dialog.open(this.jsonDialogTemplate, {
      width: '500px',
      disableClose: false,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result: 'skip' | 'choose' | 'cancel') => {
      if (result === 'choose') this.chooseJson();
      if (result === 'skip') this.uploadArchive();
      if (result === 'cancel') {
        this.selectedArchive = null;
        this.selectedJson = null;
      }
    });
  }

  chooseJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        this.selectedJson = file;
        this.uploadArchive();
      }
    };
    input.click();
  }

  uploadArchive() {
    if (!this.selectedArchive) return;

    this.loading = true;

    this.api.uploadArchive(this.selectedArchive, this.selectedJson ?? undefined)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: () => {
          this.selectedArchive = null;
          this.selectedJson = null;
          this.onRefresh();
        },
        error: (err) => {
          console.error(err);
          this.error = 'Не удалось загрузить архив';
        }
      });
  }

  openDeleteDialog(){
    const dialogRef = this.dialog.open(this.deleteDialogTemplate, {
      width: '500px',
      disableClose: false,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result: 'delete') => {
      if (result === 'delete') this.remove();
    });
  }

  get trashImages(){
    return this.selected.flatMap(x => x.trashImages);
  }
}
