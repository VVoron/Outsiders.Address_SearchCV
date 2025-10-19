import { Component, Input } from '@angular/core';
import { GridComponent, DataBindingDirective, CheckboxColumnComponent, ColumnComponent } from "@progress/kendo-angular-grid";
import { UserDto } from '../../data-models/userDto';

@Component({
  selector: 'app-user-grid',
  imports: [GridComponent, DataBindingDirective, CheckboxColumnComponent, ColumnComponent],
  templateUrl: './user-grid.component.html',
  styleUrl: './user-grid.component.scss'
})
export class UserGridComponent {

  @Input() data: UserDto[] = [];

  onSelectionChange(e: any) {

  }
}
