import { Component, ElementRef, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImageLocationsService } from '../../services/image-locations.service';
import { ImageDTO, UploadImageItem } from '../../data-models/addressDto';

type PhotoItem = {
  file: File;
  url: string;
  hover: boolean;
  meta: { address: string; lat: string; lon: string; height: string; angle: string };
};

@Component({
  selector: 'app-photo-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './photo-manager.component.html',
  styleUrl: './photo-manager.component.scss',
})
export class PhotoManagerComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  photos: PhotoItem[] = [];
  uploading = false;

  constructor(
    private dialogRef: MatDialogRef<PhotoManagerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { files: File[] },
    private imageSvc: ImageLocationsService
  ) {
    if (data?.files?.length) {
      this.addFiles(data.files);
    }
  }

  addFiles(files: File[]) {
    const newPhotos: PhotoItem[] = Array.from(files).map(file => ({
      file,
      url: URL.createObjectURL(file),
      hover: false,
      meta: { address: '', lat: '', lon: '', height: '', angle: '' }
    }));
    this.photos.push(...newPhotos);
  }

  openFileDialog() {
    this.fileInput.nativeElement.click();
  }

  onMoreFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.addFiles(Array.from(input.files));
    input.value = '';
  }

  removePhoto(index: number) {
    this.photos.splice(index, 1);
  }

  close() {
    this.dialogRef.close();
  }

  private parseNullableNumber(v: string): number | null {
    if (v == null) return null;
    const trimmed = v.trim();
    if (!trimmed) return null;
    const num = Number(trimmed.replace(',', '.'));
    return Number.isFinite(num) ? num : null;
  }

  submitAll() {
    if (!this.photos.length || this.uploading) return;

    const payload: UploadImageItem[] = this.photos.map(p => ({
      image: p.file,
      addres: p.meta.address?.trim() || null,
      angle: this.parseNullableNumber(p.meta.angle),
      height: this.parseNullableNumber(p.meta.height),
      lat: this.parseNullableNumber(p.meta.lat),
      lon: this.parseNullableNumber(p.meta.lon)
    }));

    this.uploading = true;
    this.imageSvc.uploadImages(payload).subscribe({
      next: (images: ImageDTO[]) => {
        this.uploading = false;
        this.dialogRef.close({ uploaded: images });
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.uploading = false;
      }
    });
  }
}