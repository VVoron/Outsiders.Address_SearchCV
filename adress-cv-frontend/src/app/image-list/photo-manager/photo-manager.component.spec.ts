import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoManagerComponent } from './photo-manager.component';

describe('PhotoManagerComponent', () => {
  let component: PhotoManagerComponent;
  let fixture: ComponentFixture<PhotoManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhotoManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
