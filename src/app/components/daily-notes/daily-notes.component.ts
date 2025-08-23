import { Component, OnInit, OnDestroy } from '@angular/core';

import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { NotesService } from '../../services/notes.service';
import { SessionService } from '../../services/session.service';
import { DailyNote, NotesDateRange } from '../../interfaces/Note';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-daily-notes',
  standalone: true,
  imports: [CommonModule,FormsModule,ReactiveFormsModule],
  templateUrl: './daily-notes.component.html',
  styleUrl: './daily-notes.component.css'
})
export class DailyNotesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State management
  currentDate: string = '';
 selectedDate: string = '';
  notes: string = '';
  isLoading: boolean = false;
  isSaving: boolean = false;
  showSuccess: boolean = false;
  showError: boolean = false;
  errorMessage: string = '';
  

  // Search and filter
  searchTerm: string = '';
  showSearch: boolean = false;
  searchResults: DailyNote[] = [];
  isSearching: boolean = false;
  


  // All notes view
  allNotes: DailyNote[] = [];
  showAllNotes: boolean = false;
  
  // Date range filter
  startDate: string = '';
  endDate: string = '';
  showDateFilter: boolean = false;
  
  // User data
  agentId: string = '';
  userName: string = '';

  constructor(
    private notesService: NotesService,
    private sessionService: SessionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Get user session
    const user = this.sessionService.getCurrentUser();
    const agentId = this.sessionService.getAgentId();
    
    if (!user || !agentId) {
      this.router.navigate(['/login']);
      return;
    }

    this.agentId = agentId;
    this.userName = `${user.FirstName} ${user.LastName}`;
    
    // Set current date
    this.currentDate = this.formatDate(new Date());
    this.selectedDate = this.currentDate;
    
    // Load today's notes
    this.loadDailyNotes();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatDisplayDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  loadDailyNotes(): void {
    if (!this.selectedDate) return;
    
    this.isLoading = true;
    this.notesService.getDailyNotes(this.agentId, this.selectedDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.notes = notes.length > 0 ? notes[0].Notes : '';
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading notes:', error);
          this.showErrorMessage('Failed to load notes');
          this.isLoading = false;
        }
      });
  }

  saveNotes(): void {
    if (!this.notes.trim()) {
      this.showErrorMessage('Please enter some notes before saving');
      return;
    }

    this.isSaving = true;
    this.notesService.saveDailyNotes(this.agentId, this.selectedDate, this.notes.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.RowsAffected > 0) {
            this.showSuccessMessage('Notes saved successfully');
          }
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error saving notes:', error);
          this.showErrorMessage('Failed to save notes');
          this.isSaving = false;
        }
      });
  }

  deleteNotes(): void {
    if (!confirm('Are you sure you want to delete notes for this date?')) {
      return;
    }

    this.isLoading = true;
    this.notesService.deleteNotes(this.agentId, this.selectedDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.RowsAffected > 0) {
            this.notes = '';
            this.showSuccessMessage('Notes deleted successfully');
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error deleting notes:', error);
          this.showErrorMessage('Failed to delete notes');
          this.isLoading = false;
        }
      });
  }

  onDateChange(): void {
    this.loadDailyNotes();
  }

  goToToday(): void {
    this.selectedDate = this.currentDate;
    this.loadDailyNotes();
  }

  goToPreviousDay(): void {
    const date = new Date(this.selectedDate);
    date.setDate(date.getDate() - 1);
    this.selectedDate = this.formatDate(date);
    this.loadDailyNotes();
  }

  goToNextDay(): void {
    const date = new Date(this.selectedDate);
    date.setDate(date.getDate() + 1);
    this.selectedDate = this.formatDate(date);
    this.loadDailyNotes();
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchTerm = '';
      this.searchResults = [];
    }
  }

  searchNotes(): void {
    if (!this.searchTerm.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    this.notesService.searchNotes(this.agentId, this.searchTerm.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.isSearching = false;
        },
        error: (error) => {
          console.error('Error searching notes:', error);
          this.showErrorMessage('Failed to search notes');
          this.isSearching = false;
        }
      });
  }

  selectSearchResult(note: DailyNote): void {
    this.selectedDate = note.NoteDate;
    this.showSearch = false;
    this.searchTerm = '';
    this.searchResults = [];
    this.loadDailyNotes();
  }

  toggleAllNotes(): void {
    this.showAllNotes = !this.showAllNotes;
    if (this.showAllNotes) {
      this.loadAllNotes();
    }
  }

  toggleDateFilter(): void {
    this.showDateFilter = !this.showDateFilter;
  }

  loadAllNotes(): void {
    this.isLoading = true;
    
    let range: NotesDateRange | undefined;
    if (this.startDate || this.endDate) {
      range = {
        StartDate: this.startDate || undefined,
        EndDate: this.endDate || undefined
      };
    }

    this.notesService.getAllNotes(this.agentId, range)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.allNotes = notes.sort((a, b) => 
            new Date(b.NoteDate).getTime() - new Date(a.NoteDate).getTime()
          );
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading all notes:', error);
          this.showErrorMessage('Failed to load notes');
          this.isLoading = false;
        }
      });
  }

  applyDateFilter(): void {
    if (this.showAllNotes) {
      this.loadAllNotes();
    }
    this.showDateFilter = false;
  }

  clearDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    if (this.showAllNotes) {
      this.loadAllNotes();
    }
    this.showDateFilter = false;
  }

  selectNoteFromAll(note: DailyNote): void {
    this.selectedDate = note.NoteDate;
    this.showAllNotes = false;
    this.loadDailyNotes();
  }

  private showSuccessMessage(message: string): void {
    this.showSuccess = true;
    setTimeout(() => {
      this.showSuccess = false;
    }, 3000);
  }

  private showErrorMessage(message: string): void {
    this.errorMessage = message;
    this.showError = true;
    setTimeout(() => {
      this.showError = false;
      this.errorMessage = '';
    }, 5000);
  }
formatNoteTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

  logout(): void {
    this.sessionService.logout();
  }
}