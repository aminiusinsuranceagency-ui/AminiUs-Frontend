
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AgentService } from '../../services/agent.service';
import { SessionService } from '../../services/session.service';
import { NotesService } from '../../services/notes.service';
import { AgentProfile, PasswordResponse } from '../../interfaces/Agent';
import { DailyNote, SaveNotesResult, DeleteNotesResult } from '../../interfaces/Note';
import * as CryptoJS from 'crypto-js';
import { CommonModule } from '@angular/common';

interface ConfirmationDialog {
  show: boolean;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info';
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
}
@Component({
  selector: 'app-agent',
  standalone:true,
  imports: [CommonModule,FormsModule,ReactiveFormsModule],
  templateUrl: './agent.component.html',
  styleUrl: './agent.component.css'
})
export class AgentComponent  implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // UI State
  activeTab: 'profile' | 'notes' | 'security' = 'profile';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // User Data
  currentUser: AgentProfile | null = null;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // Notes Data
  notes: DailyNote[] = [];
  selectedDate = '';
  currentNoteContent = '';
  isNotesLoading = false;
  notesSaved = false;

  // Confirmation Dialog
  confirmationDialog: ConfirmationDialog = {
    show: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {}
  };

  constructor(
    private fb: FormBuilder,
    private agentService: AgentService,
    private sessionService: SessionService,
    private notesService: NotesService
  ) {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadNotesForSelectedDate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9\s\-\(\)]+$/)]],
      role: [''],
      companyName: [''],
      avatar: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  private loadUserProfile(): void {
    this.currentUser = this.sessionService.getCurrentUser();
    if (this.currentUser) {
      this.profileForm.patchValue({
        firstName: this.currentUser.FirstName,
        lastName: this.currentUser.LastName,
        email: this.currentUser.Email,
        phone: this.currentUser.Phone,
        role: this.currentUser.Role || '',
        companyName: this.currentUser.CompanyName || '',
        avatar: this.currentUser.Avatar || ''
      });
    } else {
      this.errorMessage = 'Unable to load user profile. Please log in again.';
    }
  }

  switchTab(tab: 'profile' | 'notes' | 'security'): void {
    if (this.activeTab === 'notes' && this.currentNoteContent && !this.notesSaved) {
      this.showConfirmation({
        title: 'Unsaved Changes',
        message: 'You have unsaved notes. Do you want to save them before switching tabs?',
        type: 'warning',
        confirmText: 'Save & Switch',
        cancelText: 'Discard & Switch',
        onConfirm: () => {
          this.saveNotes().then(() => {
            this.activeTab = tab;
            if (tab === 'notes') {
              this.loadNotesForSelectedDate();
            }
          });
        }
      });
    } else {
      this.activeTab = tab;
      if (tab === 'notes') {
        this.loadNotesForSelectedDate();
      }
    }
  }

  // Profile Management
  updateProfile(): void {
    if (this.profileForm.invalid || !this.currentUser) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.showConfirmation({
      title: 'Update Profile',
      message: 'Are you sure you want to update your profile information?',
      type: 'info',
      confirmText: 'Update',
      cancelText: 'Cancel',
      onConfirm: () => this.performProfileUpdate()
    });
  }

  private performProfileUpdate(): void {
    if (!this.currentUser) return;

    this.isLoading = true;
    this.clearMessages();

    const formValue = this.profileForm.value;
    const updatedProfile: Partial<AgentProfile> = {
      FirstName: formValue.firstName,
      LastName: formValue.lastName,
      Email: formValue.email,
      Phone: formValue.phone,
      Role: formValue.role,
      CompanyName: formValue.companyName,
      Avatar: formValue.avatar
    };

    // Update via agent service
    this.agentService.upsertAgentProfile({
      agentId: this.currentUser.AgentId,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      phone: formValue.phone,
      passwordHash: this.currentUser.PasswordHash,
      avatar: formValue.avatar
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        // Update session with new profile data
        this.sessionService.updateUserProfile(updatedProfile);
        this.currentUser = this.sessionService.getCurrentUser();
        this.successMessage = 'Profile updated successfully!';
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.Message || 'Failed to update profile';
        this.isLoading = false;
      }
    });
  }

  // Password Management
  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.showConfirmation({
      title: 'Change Password',
      message: 'Are you sure you want to change your password? You will need to use the new password for future logins.',
      type: 'warning',
      confirmText: 'Change Password',
      cancelText: 'Cancel',
      onConfirm: () => this.performPasswordChange()
    });
  }

  private performPasswordChange(): void {
    if (!this.currentUser) return;

    this.isLoading = true;
    this.clearMessages();

    const formValue = this.passwordForm.value;
    const oldPasswordHash = CryptoJS.SHA256(formValue.currentPassword).toString();
    const newPasswordHash = CryptoJS.SHA256(formValue.newPassword).toString();

    this.agentService.changeAgentPassword(this.currentUser.AgentId, {
      oldPasswordHash,
      newPasswordHash
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: PasswordResponse) => {
        if (response.Success) {
          this.successMessage = 'Password changed successfully!';
          this.passwordForm.reset();
        } else {
          this.errorMessage = response.Message || 'Failed to change password';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.Message || 'Failed to change password';
        this.isLoading = false;
      }
    });
  }

  resetPassword(): void {
    if (!this.currentUser?.Email) {
      this.errorMessage = 'Unable to reset password: no email found';
      return;
    }

    this.showConfirmation({
      title: 'Reset Password',
      message: `A password reset link will be sent to ${this.currentUser.Email}. You will be logged out and need to check your email to complete the reset.`,
      type: 'warning',
      confirmText: 'Send Reset Link',
      cancelText: 'Cancel',
      onConfirm: () => this.performPasswordReset()
    });
  }

  private performPasswordReset(): void {
    if (!this.currentUser?.Email) return;

    this.isLoading = true;
    this.clearMessages();

    this.agentService.requestPasswordReset({ Email: this.currentUser.Email })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.Success) {
            this.successMessage = 'Password reset link sent to your email!';
            // Log out user after password reset request
            setTimeout(() => {
              this.sessionService.logout(false);
            }, 2000);
          } else {
            this.errorMessage = response.Message || 'Failed to send reset link';
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.Message || 'Failed to send reset link';
          this.isLoading = false;
        }
      });
  }

  // Notes Management
  onDateChange(event: any): void {
    const newDate = event.target.value;
    
    if (this.currentNoteContent && !this.notesSaved) {
      this.showConfirmation({
        title: 'Unsaved Changes',
        message: 'You have unsaved notes for the current date. Do you want to save them before switching dates?',
        type: 'warning',
        confirmText: 'Save & Switch',
        cancelText: 'Discard & Switch',
        onConfirm: () => {
          this.saveNotes().then(() => {
            this.selectedDate = newDate;
            this.loadNotesForSelectedDate();
          });
        }
      });
    } else {
      this.selectedDate = newDate;
      this.loadNotesForSelectedDate();
    }
  }

  private loadNotesForSelectedDate(): void {
    if (!this.currentUser?.AgentId || !this.selectedDate) return;

    this.isNotesLoading = true;
    this.clearMessages();

    this.notesService.getDailyNotes(this.currentUser.AgentId, this.selectedDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes: DailyNote[]) => {
          this.notes = notes;
          this.currentNoteContent = notes.length > 0 ? notes[0].Notes : '';
          this.notesSaved = true;
          this.isNotesLoading = false;
        },
        error: (error) => {
          console.error('Failed to load notes:', error);
          this.currentNoteContent = '';
          this.notesSaved = true;
          this.isNotesLoading = false;
        }
      });
  }

  onNotesChange(): void {
    this.notesSaved = false;
  }

  async saveNotes(): Promise<void> {
    if (!this.currentUser?.AgentId || !this.selectedDate) {
      this.errorMessage = 'Unable to save notes: missing user or date information';
      return;
    }

    this.isNotesLoading = true;
    this.clearMessages();

    try {
      const result = await this.notesService.saveDailyNotes(
        this.currentUser.AgentId,
        this.selectedDate,
        this.currentNoteContent
      ).toPromise();

      if (result && result.RowsAffected > 0) {
        this.successMessage = 'Notes saved successfully!';
        this.notesSaved = true;
        // Reload notes to get updated data
        this.loadNotesForSelectedDate();
      } else {
        this.errorMessage = 'No changes were made to notes';
      }
    } catch (error: any) {
      this.errorMessage = error.error?.Message || 'Failed to save notes';
    } finally {
      this.isNotesLoading = false;
    }
  }

  deleteNotes(): void {
    if (!this.currentNoteContent.trim()) {
      this.errorMessage = 'No notes to delete for this date';
      return;
    }

    this.showConfirmation({
      title: 'Delete Notes',
      message: `Are you sure you want to delete all notes for ${this.formatDate(this.selectedDate)}? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => this.performDeleteNotes()
    });
  }

  private performDeleteNotes(): void {
    if (!this.currentUser?.AgentId || !this.selectedDate) return;

    this.isNotesLoading = true;
    this.clearMessages();

    this.notesService.deleteNotes(this.currentUser.AgentId, this.selectedDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: DeleteNotesResult) => {
          if (result.RowsAffected > 0) {
            this.successMessage = 'Notes deleted successfully!';
            this.currentNoteContent = '';
            this.notesSaved = true;
            this.loadNotesForSelectedDate();
          } else {
            this.errorMessage = 'No notes found to delete';
          }
          this.isNotesLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.Message || 'Failed to delete notes';
          this.isNotesLoading = false;
        }
      });
  }

  // Utility Methods
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

   formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private showConfirmation(config: Omit<ConfirmationDialog, 'show'>): void {
    this.confirmationDialog = {
      ...config,
      show: true
    };
  }

  hideConfirmation(): void {
    this.confirmationDialog.show = false;
  }

  confirmAction(): void {
    this.confirmationDialog.onConfirm();
    this.hideConfirmation();
  }

  // Form Validation Helpers
  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) return `Please enter a valid ${fieldName}`;
    }
    return '';
  }

  // Avatar handling
  onAvatarChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Handle file upload logic here
      // For now, just store the file name
      this.profileForm.patchValue({ avatar: file.name });
    }
  }

  // Quick navigation to other dates
  navigateToToday(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.loadNotesForSelectedDate();
  }

  navigateToYesterday(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.selectedDate = yesterday.toISOString().split('T')[0];
    this.loadNotesForSelectedDate();
  }

  // Search functionality for notes
  searchNotes(searchTerm: string): void {
    if (!this.currentUser?.AgentId || !searchTerm.trim()) return;

    this.isNotesLoading = true;
    this.notesService.searchNotes(this.currentUser.AgentId, searchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (searchResults) => {
          // Handle search results - could navigate to found dates or show in modal
          console.log('Search results:', searchResults);
          this.isNotesLoading = false;
        },
        error: (error) => {
          console.error('Search failed:', error);
          this.isNotesLoading = false;
        }
      });
  }
}