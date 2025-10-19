import { Component, OnInit } from '@angular/core';
import { UserGridComponent } from './user-grid/user-grid.component';
import { UserDto } from '../data-models/userDto';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-user-list.component',
  imports: [UserGridComponent, AsyncPipe],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit {

  private testData: UserDto[] = [];

  private loadImages() {
    this.testData = [
    {
      id: 1,
      login: 'Aboba',
      name: 'Aboba 1',
      role: 'Обычный',
    },
    {
      id: 2,
      login: 'Lens',
      name: 'Иван Иванов',
      role: 'Обычный',
    },
    {
      id: 3,
      login: 'rb-address-cv',
      name: 'Admin Robot',
      role: 'Админ',
    },
  ];
  }

  filteredData$ = new BehaviorSubject<UserDto[]>([]);
  
  ngOnInit() {
    this.loadImages();

    this.filteredData$.next(this.testData)
  }
}
