import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import maplibregl, { Map, Marker } from 'maplibre-gl';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private map!: Map;
  private isBrowser: boolean;
  selectedPoints: { id: number; lat: number; lon: number; address: string }[] = [];
  private markers: Marker[] = [];

  readonly styleUrl = 'http://51.250.115.228:8081/styles/positron/style.json';

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private router: Router) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    // Инициализация карты
    this.map = new maplibregl.Map({
      container: this.mapEl.nativeElement,
      style: this.styleUrl,
      center: [37.6175, 55.750555], // Москва
      zoom: 11,
      hash: true
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true,  }), 'top-left');

    this.map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: '© OpenStreetMap contributors | OUTSIDERS'
    }));


    // Читаем state
    const statePoints = history.state?.points;
    if (statePoints) {
      this.selectedPoints = statePoints;
      this.addMarkers();
    }
  }

  private addMarkers(): void {
    if (!this.map) return;

    // Удаляем старые маркеры
    this.markers.forEach(m => m.remove());
    this.markers = [];

    const bounds = new maplibregl.LngLatBounds();

    this.selectedPoints.forEach(p => {
      const marker = new maplibregl.Marker({ color: '#e74c3c', anchor: 'bottom' })
        .setLngLat([p.lon, p.lat])
        .setPopup(new maplibregl.Popup().setHTML(`<b>ID:</b> ${p.id}<br>${p.address || ''}`))
        .addTo(this.map);

      this.markers.push(marker);
      bounds.extend([p.lon, p.lat]);
    });

    if (this.selectedPoints.length > 0) {
      this.map.fitBounds(bounds, { padding: 50 });
    }
  }

  // Метод для центрирования на конкретной точке (если кликнуть в списке)
  focusPoint(p: { id: number; lat: number; lon: number; address: string }): void {
    this.map.easeTo({ center: [p.lon, p.lat], zoom: 15 });
  }
}
