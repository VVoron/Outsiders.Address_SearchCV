import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavMenu } from './nav-menu/nav-menu';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavMenu],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('adress-cv-frontend');

  constructor(private router: Router){}

  getPageTitle(): string{
    const url = this.router.url;

    if (url.includes('/image-list')) {
      return 'Главная страница';
    } else if (url.includes('/map')) {
      return 'Карта Москвы';
    } else if (url.includes('/user-list')) {
      return 'Список пользователей';
    }

    return '';
  }
}
