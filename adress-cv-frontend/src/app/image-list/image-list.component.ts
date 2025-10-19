import { Component, ElementRef, inject, TemplateRef, ViewChild } from '@angular/core';
import { ImageGridComponent } from "./image-grid/image-grid.component";
import { AddressDto, ImageDTO } from '../data-models/addressDto';
import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { BehaviorSubject, combineLatest, forkJoin } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { TextBoxModule } from '@progress/kendo-angular-inputs';
import { DatePickerModule } from '@progress/kendo-angular-dateinputs';
import { ImageLocationsService } from '../services/image-locations.service';
import { DialogComponent } from "@progress/kendo-angular-dialog";
import { MapViewComponent } from "../map-view/map-view";
import { PhotoManagerComponent } from "./photo-manager/photo-manager.component";
import { MatDialog, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { GridDataResult, PageChangeEvent } from '@progress/kendo-angular-grid';


@Component({
  selector: 'app-image-list',
  imports: [ImageGridComponent, TextBoxModule, DatePickerModule, AsyncPipe, DialogComponent, MapViewComponent, MatDialogContent, MatDialogActions],
  templateUrl: './image-list.component.html',
  styleUrl: './image-list.component.scss'
})
export class ImageListComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('archiveInput') archiveInput!: ElementRef<HTMLInputElement>;

  @ViewChild('jsonDialog') jsonDialogTemplate!: TemplateRef<any>;

  private api = inject(ImageLocationsService);

  rows: AddressDto[] = [];
  loading = false;
  error = '';

  selected: AddressDto[] = [];

  selectedArchive: File | null = null;
  selectedJson: File | null = null;

  dialogOpen = false;

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
    this.dialogOpen = true;
  }

  closeDialog() {
    this.dialogOpen = false;
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

  get selectedPoints(): { lat: number; lon: number }[] {
    const pts: { lat: number; lon: number }[] = [];

    for (const s of this.selected) {
      const items = s.trash_images ?? [];
      for (const t of items) {
        const lat = typeof t.lan === 'number' ? t.lan : Number.NaN;
        const lon = typeof t.lot === 'number' ? t.lot : Number.NaN;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          pts.push({ lat, lon });
        }
      }
    }

    // Опционально удалим дубликаты (по ~6 знаков)
    const uniq = new Map<string, { lat: number; lon: number }>();
    for (const p of pts) uniq.set(`${p.lat.toFixed(6)}:${p.lon.toFixed(6)}`, p);

    // Фолбэк: если ни одной мусорной точки нет — вернём основные
    const result = Array.from(uniq.values());
    return result.length ? result : this.selected.map(s => ({ lat: s.lat, lon: s.lon }));
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
      disableClose: true,
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
}
