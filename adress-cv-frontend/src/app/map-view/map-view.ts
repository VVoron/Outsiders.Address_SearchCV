import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import maplibregl, { Map, Marker, LngLatLike, LngLatBoundsLike } from 'maplibre-gl';
import { AddressShortDto } from '../data-models/addressDto';
import type { FeatureCollection, Feature, Polygon, Position } from 'geojson';
import { ImageLocationsService } from '../services/image-locations.service';

const DEFAULTS = {
  lat: 55.74724,
  lon: 37.62096,
  zoom: 14,
  STYLE_URL: 'http://51.250.115.228:8081/styles/positron/style.json',
};

function parseCoord(v: string | number): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v).trim().replace(',', '.'));
}

const MARKER_SIZES = {
  active: 48,
  trash:  40,
} as const;


@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-view.html',
  styleUrls: ['./map-view.scss'],
})
export class MapViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  @Input() styleUrl = DEFAULTS.STYLE_URL;
  @Input() addresses: AddressShortDto[] = []; 
  @Input() points: { lat: number; lon: number }[] = [];
  @Input() zoom = 14;
  @Input() height = '100%';
  @Input() minHeight = '320px';
  @Input() showControls = true;
  @Input() allowClickToMove = true;

  @Input() autoFit = true;
  @Input() fitPadding = 40;

  private searchMarkers: Marker[] = [];

  @Output() pointChange = new EventEmitter<{ lat: number; lon: number }>();
  @Output() mapReady = new EventEmitter<maplibregl.Map>();

  // поля ввода
  latStr = '';
  lonStr = '';

  private map?: Map;

  // пассивные маркеры из @Input points
  private staticMarkers: Marker[] = [];

  // активный пользовательский маркер (всегда один)
  private activeMarker?: Marker;

  // id-ы источника/слоёв круга
  private readonly circleSourceId = 'user-circle-src';
  private readonly circleFillId = 'user-circle-fill';
  private readonly circleStrokeId = 'user-circle-stroke';

  constructor(private imageSvc: ImageLocationsService) {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points'] && this.map) {
      this.staticMarkers.forEach(m => m.remove());
      this.staticMarkers = [];
      this.addStaticMarkers();
      this.fitToPoints(this.inputPoints);
    }
  }

  get inputPoints(){
    if (this.addresses.length > 0){
      const pts: { lat: number; lon: number }[] = [];
      for (const t of this.addresses) {
        const lat = typeof t.lat === 'number' ? t.lat : Number.NaN;
        const lon = typeof t.lon === 'number' ? t.lon : Number.NaN;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          pts.push({ lat, lon });
        }
      }

      return pts
    }
    return this.points;
  }

  private resolvePublicUrl(rel: string): string {
    return new URL(rel.replace(/^\/+/, ''), document.baseURI).toString();
  }

  private makeImgMarkerEl(src: string, size = 30, title?: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'img-marker';
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;
    wrap.style.lineHeight = '0';

    const img = document.createElement('img');
    img.src = src;
    img.alt = title ?? '';
    img.width = size;
    img.height = size;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.display = 'block';
    img.draggable = false;

    wrap.appendChild(img);
    return wrap;
  }

  private initMap(): void {
    const center: LngLatLike = [
      this.inputPoints[0]?.lon ?? DEFAULTS.lon,
      this.inputPoints[0]?.lat ?? DEFAULTS.lat,
    ];

    this.map = new maplibregl.Map({
      container: this.mapEl.nativeElement,
      style: this.styleUrl,
      center,
      zoom: this.zoom,
    });

    if (this.showControls) {
      this.map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    }

    this.addStaticMarkers();

    if (this.allowClickToMove) {
      this.map.on('click', (e) => {
        const lat = Number(e.lngLat.lat.toFixed(12));
        const lon = Number(e.lngLat.lng.toFixed(12));
        this.latStr = lat.toString();
        this.lonStr = lon.toString();

        this.updateActiveMarker(lat, lon, true);
        this.updateCircle(lat, lon, 1);


        this.imageSvc.getTrashByCoordinates(lat, lon, 1).subscribe({
          next: (items) => this.renderSearchMarkers(items),
          error: () => this.renderSearchMarkers([]),
        });

        this.pointChange.emit({ lat, lon });
      });
    }

    this.map.once('load', () => {
      if (this.inputPoints.length) {
        this.fitToPoints(this.inputPoints);
      } else {
        const c = this.map!.getCenter();
        this.latStr = c.lat.toFixed(12);
        this.lonStr = c.lng.toFixed(12);
      }
      this.mapReady.emit(this.map!);
    });
  }

  private renderSearchMarkers(points: { lat: number; lon: number }[]): void {
    if (!this.map) return;

    this.searchMarkers.forEach(m => m.remove());
    this.searchMarkers = [];

    for (const p of points) {
      const el = this.makeImgMarkerEl(
        this.resolvePublicUrl('search_marker.svg'),
        MARKER_SIZES.trash,
        'Точка мусора'
      );

      const m = new maplibregl.Marker({
          element: el,
          draggable: false,
          anchor: 'bottom',
        })
        .setLngLat([p.lon, p.lat])
        .addTo(this.map!);

      this.searchMarkers.push(m);
    }
  }

  private addStaticMarkers() {
    if (!this.map) return;

    for (const p of this.inputPoints) {
      const el = this.makeImgMarkerEl(
        this.resolvePublicUrl('search_marker.svg'),
        MARKER_SIZES.trash,
        'Точка мусора'
      );

      const m = new maplibregl.Marker({
          element: el,
          draggable: false,
          anchor: 'bottom',
        })
        .setLngLat([p.lon, p.lat])
        .addTo(this.map!);

      this.staticMarkers.push(m);
    }
  }

  private makePinEl(color = '#ef4444', size = 28, title?: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'svg-marker';
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="svg-marker__svg" ${title ? `role="img"` : ''}>
        ${title ? `<title>${title}</title>` : ''}
        <!-- классический "пин" -->
        <path fill="${color}" stroke="#ffffff" stroke-width="1.5"
          d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5
            2.5 2.5 0 0 1 0 5z"/>
      </svg>`;
    return el;
  }

  private makeTrashMarkerEl(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'trash-marker';

    const pulse = document.createElement('div');
    pulse.className = 'trash-marker__pulse';
    el.appendChild(pulse);
    return el;
  }

  private fitToPoints(pts: { lat: number; lon: number }[]) {
    if (!this.map || !pts?.length) return;

    if (pts.length === 1) {
      this.map.easeTo({
        center: [pts[0].lon, pts[0].lat],
        zoom: Math.max(this.zoom, 15),
        duration: 600
      });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    pts.forEach(p => bounds.extend([p.lon, p.lat]));
    this.map.fitBounds(bounds, { padding: 40, duration: 700 });
  }

  goToInputCoords(): void {
    const lat = parseCoord(this.latStr);
    const lon = parseCoord(this.lonStr);

    if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      alert('Неверные координаты. Lat ∈ [-90..90], Lon ∈ [-180..180].');
      return;
    }

    const nLat = +lat.toFixed(12);
    const nLon = +lon.toFixed(12);

    this.updateActiveMarker(nLat, nLon, true);
    this.updateCircle(nLat, nLon, 1);

    this.imageSvc.getTrashByCoordinates(nLat, nLon, 1).subscribe({
      next: (items) => this.renderSearchMarkers(items),
      error: () => this.renderSearchMarkers([]),
    });

    this.latStr = nLat.toFixed(12);
    this.lonStr = nLon.toFixed(12);
    this.pointChange.emit({ lat: nLat, lon: nLon });
  }

  /** Создаёт/перемещает единственный активный маркер */
  private updateActiveMarker(lat: number, lon: number, animate = false): void {
    if (!this.map) return;

    if (this.activeMarker) {
      this.activeMarker.remove();
      this.activeMarker = undefined;
    }

    const el = this.makeImgMarkerEl(
      this.resolvePublicUrl('red_marker.svg'),
      MARKER_SIZES.active,
      'Выбранная точка'
    );

    this.activeMarker = new maplibregl.Marker({
        element: el,
        draggable: false,
        anchor: 'bottom',
        // offset: [0, -2],
      })
      .setLngLat([lon, lat])
      .addTo(this.map!);

    if (animate) this.map.easeTo({ center: [lon, lat], duration: 600 });
    else this.map.setCenter([lon, lat]);
  }

  /** Рисует/обновляет круг заданного радиуса (км) вокруг активной точки */
  private updateCircle(lat: number, lon: number, radiusKm: number) {
    if (!this.map) return;

    const data = this.circleGeoJSON(lon, lat, radiusKm, 128);

    if (!this.map.getSource(this.circleSourceId)) {
      this.map.addSource(this.circleSourceId, {
        type: 'geojson',
        data,
      });

      this.map.addLayer({
        id: this.circleFillId,
        type: 'fill',
        source: this.circleSourceId,
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.15,
        },
      });

      this.map.addLayer({
        id: this.circleStrokeId,
        type: 'line',
        source: this.circleSourceId,
        paint: {
          'line-color': '#2563eb',
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });
    } else {
      const src = this.map.getSource(this.circleSourceId) as maplibregl.GeoJSONSource;
      src.setData(data); // без any-каста
    }
  }

  /** Формирует GeoJSON круга (геодезический) */
  private circleGeoJSON(
    lon: number,
    lat: number,
    radiusKm: number,
    steps = 64
  ): FeatureCollection<Polygon, { radius_km: number }> {
    const R = 6371; // км
    const δ = radiusKm / R;
    const φ1 = (lat * Math.PI) / 180;
    const λ1 = (lon * Math.PI) / 180;

    const coords: Position[] = [];
    for (let i = 0; i <= steps; i++) {
      const θ = (i / steps) * 2 * Math.PI;
      const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1);
      const sinδ = Math.sin(δ),   cosδ = Math.cos(δ);
      const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
      const φ2 = Math.asin(sinφ2);
      const y = Math.sin(θ) * sinδ * cosφ1;
      const x = cosδ - sinφ1 * sinφ2;
      const λ2 = λ1 + Math.atan2(y, x);

      const lat2 = (φ2 * 180) / Math.PI;
      const lon2 = (((λ2 * 180) / Math.PI + 540) % 360) - 180;

      coords.push([lon2, lat2]);
    }

    const feature: Feature<Polygon, { radius_km: number }> = {
      type: 'Feature',
      properties: { radius_km: radiusKm },
      geometry: { type: 'Polygon', coordinates: [coords] },
    };

    const collection: FeatureCollection<Polygon, { radius_km: number }> = {
      type: 'FeatureCollection',
      features: [feature],
    };

    return collection;
  }

  private removeCircle() {
    if (!this.map) return;
    if (this.map.getLayer(this.circleFillId)) this.map.removeLayer(this.circleFillId);
    if (this.map.getLayer(this.circleStrokeId)) this.map.removeLayer(this.circleStrokeId);
    if (this.map.getSource(this.circleSourceId)) this.map.removeSource(this.circleSourceId);
  }

  ngOnDestroy(): void {
    // подчистим всё
    this.staticMarkers.forEach(m => m.remove());
    this.staticMarkers = [];
    if (this.activeMarker) this.activeMarker.remove();
    this.removeCircle();
    this.map?.remove();
  }
}
