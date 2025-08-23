import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyNotesComponent } from './daily-notes.component';

describe('DailyNotesComponent', () => {
  let component: DailyNotesComponent;
  let fixture: ComponentFixture<DailyNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyNotesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
