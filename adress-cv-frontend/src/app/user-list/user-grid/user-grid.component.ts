import { Component, Input } from '@angular/core';
import { GridComponent, DataBindingDirective, CheckboxColumnComponent, ColumnComponent, CustomMessagesComponent, GridDataResult } from "@progress/kendo-angular-grid";
import { UserDto } from '../../data-models/userDto';

@Component({
  selector: 'app-user-grid',
  imports: [GridComponent, DataBindingDirective, CheckboxColumnComponent, ColumnComponent, CustomMessagesComponent],
  templateUrl: './user-grid.component.html',
  styleUrl: './user-grid.component.scss'
})
export class UserGridComponent {

  @Input() data: UserDto[] = [];
  @Input() total = 0;
  @Input() pageSize = 10;
  @Input() skip = 0;
  
  loading: boolean = false;
  
  constructor(){

  }

  get gridData(): GridDataResult {
    return { data: this.data, total: this.total };
  }

  onSelectionChange(e: any) {

  }
}
