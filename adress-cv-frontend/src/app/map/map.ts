import { Component } from '@angular/core';
import { MapViewComponent } from '../map-view/map-view';

@Component({
  selector: 'app-map',
  imports: [MapViewComponent],
  templateUrl: './map.html',
  styleUrl: './map.scss'
})
export class MapComponent {
  onPoint(e: { lat: number; lon: number }) {
    console.log('Новая точка:', e);
  }
}
