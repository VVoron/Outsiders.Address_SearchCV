import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { GridDataResult, GridModule, PageChangeEvent, SelectionEvent } from '@progress/kendo-angular-grid';
import { CommonModule, DatePipe } from '@angular/common';
import { AddressDto } from '../../data-models/addressDto';

@Component({
  selector: 'app-image-grid',
  standalone: true,
  imports: [GridModule, DatePipe, CommonModule],
  templateUrl: './image-grid.component.html',
  styleUrl: './image-grid.component.scss'
})
export class ImageGridComponent implements OnChanges {
  @Input() data: AddressDto[] = [];
  @Input() total = 0;
  @Input() pageSize = 10;
  @Input() skip = 0;

  @Output() selectedChange = new EventEmitter<AddressDto[]>();
  @Output() pageChange = new EventEmitter<PageChangeEvent>();

  selectedKeys: number[] = [];
  readonly selectBy: keyof AddressDto = 'id';

  get gridData(): GridDataResult {
    return { data: this.data, total: this.total };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      const ids = new Set(this.data.map(d => d.id));
      this.selectedKeys = this.selectedKeys.filter(id => ids.has(id));
      this.emitSelection();
    }
  }

  onSelectionChange(e: SelectionEvent) {
    const added: number[] = e.selectedRows?.map(r => r.dataItem[this.selectBy] as number) ?? [];
    const removed: number[] = e.deselectedRows?.map(r => r.dataItem[this.selectBy] as number) ?? [];

    const set = new Set(this.selectedKeys);
    removed.forEach(id => set.delete(id));
    added.forEach(id => set.add(id));

    this.selectedKeys = Array.from(set);
    this.emitSelection();
  }

  onPageChange(e: PageChangeEvent) {
    this.pageChange.emit(e);
  }

  private emitSelection() {
    const selected = this.data.filter(item => this.selectedKeys.includes(item.id));
    this.selectedChange.emit(selected);
  }
}
