import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { UserGridComponent } from './user-grid/user-grid.component';
import { UserDto } from '../data-models/userDto';
import { BehaviorSubject } from 'rxjs';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';
import { MatDialogContent, MatDialogActions, MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-user-list.component',
  imports: [UserGridComponent, AsyncPipe, CommonModule, FormsModule, MatDialogContent, MatDialogActions],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit {

  private api = inject(UserService);

  private rows: UserDto[] = [];

  @ViewChild("grid", {static: true}) userGrid!: UserGridComponent;
  @ViewChild('deleteDialog') deleteDialogTemplate!: TemplateRef<any>;

  constructor(private dialog: MatDialog){}

  private loadUsers() {
    this.userGrid.loading = true;
    this.api.list().subscribe({
      next: (res) => {
        this.rows = res.data;
        this.userGrid.loading = false;
        this.filteredData$.next(this.rows);
      },
      error: () => { 
        this.userGrid.loading = false;
      }
    });
  }

  filteredData$ = new BehaviorSubject<UserDto[]>([]);
  
  ngOnInit() {
    this.onRefreshClick();
  }

  onRefreshClick(){
    this.loadUsers();
  }

  openDeleteDialog(){
    this.dialog.open(this.deleteDialogTemplate, {
      width: '500px',
      disableClose: false,
      autoFocus: false,
    });
  }
}
