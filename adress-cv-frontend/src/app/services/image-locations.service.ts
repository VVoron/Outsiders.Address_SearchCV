import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';
import { map, Observable } from 'rxjs';
import {
  AddressDto,
  ApiImageLocationsResponse,
  ApiImageLocation,
  UploadImageItem,
  ImageDTO,
  ApiTrashImageLocation,
  AddressShortDto
} from '../data-models/addressDto';

@Injectable({ providedIn: 'root' })
export class ImageLocationsService {
  constructor(private http: HttpClient) {}

  list(page = 1, perPage = 10): Observable<{ data: AddressDto[]; total: number }> {
    const url = `${environment.API_BASE}/user/image-locations/`;

    const params = new HttpParams()
      .set('page', page)
      .set('per_page', perPage);

    return this.http
      .get<{
        meta: { total: number };
        data: ApiImageLocation[];
      }>(url, { params })
      .pipe(
        map((resp) => ({
          data: resp.data.map(this.mapOne),
          total: resp.meta?.total ?? resp.data.length
        }))
      );
  }

  delete(id: string | number) {
    const url = `${environment.API_BASE}/image-locations/${encodeURIComponent(String(id))}/`;
    return this.http.delete<void>(url);
  }

  private fmtCoord(n: number, max = 12): string {
    if (!Number.isFinite(n)) return '';
    const s = n.toFixed(max).replace(/\.?0+$/, '');
    return s === '-0' ? '0' : s;
  }

  private readonly RECOGNITION_IMG_URL =
  'http://51.250.115.228:9000/recognition/6f761b31-577a-4164-bb63-affdc1efe654_6d742687-074b-4bdc-ba40-904c4dd3ca1f.png?AWSAccessKeyId=recognition&Signature=%2BPvSB6VQtBVZWus85YoFmnwc8K8%3D&Expires=1760833204';

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  private rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private mapOne = (x: ApiImageLocation): AddressDto => {
    const mainImg = x.main_image;

    const coords = x.main_coordinates
      ? `${this.fmtCoord(x.main_coordinates.lat, 12)} c.ш. ${this.fmtCoord(x.main_coordinates.lon, 12)} в.д.`
      : '—';

    return {
      id: x.id,
      uploadDate: new Date(x.created_at),
      photoUrl: mainImg?.preview_url || mainImg?.file_path || '',
      address: x.main_address || '—',
      coordinates: coords,
      status: x.status || '—',
      lat: x.main_coordinates?.lat ?? 0,
      lon: x.main_coordinates?.lon ?? 0,
      height: x.height ?? 0,
      angle: x.angle ?? 0,
      username: x.user?.username ?? '',
      imageId: mainImg?.id,
      imageFilename: mainImg?.filename,

      trashCount: x.trash_images?.length,
      trashImages: x.trash_images.map(this.mapOneShort),
    };
  };

  private mapOneShort = (x: ApiTrashImageLocation): AddressShortDto => {
    return {
      id: x.id,
      photoUrl: x.image?.preview_url || x.image?.file_path || '',
      address: x.address || '—',
      lat: x.lat ?? 0,
      lon: x.lon ?? 0,
    };
  };


  uploadImages(items: UploadImageItem[]): Observable<ImageDTO[]> {
    const fd = new FormData();

    items.forEach((it, i) => {
      fd.append(`images_data[${i}][image]`, it.image);
      if (it.addres != null) fd.append(`images_data[${i}][addres]`, it.addres);
      if (it.angle  != null) fd.append(`images_data[${i}][angle]`,  String(it.angle));
      if (it.height != null) fd.append(`images_data[${i}][height]`, String(it.height));
      if (it.lat  != null) fd.append(`images_data[${i}][lat]`,  String(it.lat));
      if (it.lon != null) fd.append(`images_data[${i}][lon]`, String(it.lon));
    });

    console.log(items);

    return this.http
      .post<ImageDTO[] | { data: ImageDTO[] }>(`${environment.API_BASE}/upload-images/`, fd)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.data ?? []))
      );
  }

  uploadArchive(archive: File, json?: File): Observable<any> {
    const fd = new FormData();
    fd.append('archive', archive);
    if (json) fd.append('json', json);
    return this.http.post<any>(`${environment.API_BASE}/upload-archive/`, fd);
  }


  getTrashByCoordinates(lat: number, lon: number, radiusKm: number): Observable<AddressShortDto[]> {
    const url = `${environment.API_BASE}/map/trash-images-by-coordinates/`;
    const params = new HttpParams()
      .set('lat', String(lat))
      .set('lon', String(lon))
      .set('radius_km', String(radiusKm));

    return this.http
      .get<{ data: ApiTrashImageLocation[] }>(url, { params })
      .pipe(map(res => res.data.map(this.mapOneShort) ?? []));
  }
}
