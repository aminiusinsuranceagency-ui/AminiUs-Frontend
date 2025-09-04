import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RemindersService } from '../../services/reminders.service';
import { ToastService } from '../../services/toast.service';
import { SessionService } from '../../services/session.service';
import { PolicyService } from '../../services/policies.service';
import { 
  Reminder, 
  CreateReminderRequest, 
  UpdateReminderRequest, 
  ReminderFilters,
  ReminderStatistics 
} from '../../interfaces/Reminder';
import { ClientWithPolicies } from '../../interfaces/CLIENTS-POLICY';
import { NavbarComponent } from "../navbar/navbar.component";

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './reminders.component.html',
  styleUrl: './reminders.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class RemindersComponent implements OnInit {
  // Form and UI state
  reminderForm!: FormGroup;
  showAddForm = false;
  isLoading = false;
  isEditing = false;
  editingReminderId: string | null = null;

  // Data
  reminders: Reminder[] = [];
  filteredReminders: Reminder[] = [];
  clients: ClientWithPolicies[] = [];
  statistics: ReminderStatistics | null = null;
  agentId: string | null = null;

  // Filters and pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  searchTerm = '';
  statusFilter = '';
  typeFilter = '';
  priorityFilter = '';

  // Constants
  reminderTypes = [
    { value: 'Call', label: 'Call', icon: 'fa-phone' },
    { value: 'Visit', label: 'Visit', icon: 'fa-home' },
    { value: 'Policy Expiry', label: 'Policy Expiry', icon: 'fa-calendar-times' },
    { value: 'Birthday', label: 'Birthday', icon: 'fa-birthday-cake' },
    { value: 'Holiday', label: 'Holiday', icon: 'fa-star' },
    { value: 'Custom', label: 'Custom', icon: 'fa-bell' }
  ];

  priorities = [
    { value: 'High', label: 'High', class: 'badge-danger' },
    { value: 'Medium', label: 'Medium', class: 'badge-warning' },
    { value: 'Low', label: 'Low', class: 'badge-info' }
  ];

  statuses = [
    { value: 'Active', label: 'Active', class: 'badge-success' },
    { value: 'Completed', label: 'Completed', class: 'badge-secondary' },
    { value: 'Cancelled', label: 'Cancelled', class: 'badge-danger' }
  ];
  Math: any;

  constructor(
    private fb: FormBuilder,
    private remindersService: RemindersService,
    private toastService: ToastService,
    private sessionService: SessionService,
    private policyService: PolicyService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    console.log('🚀 COMPONENT INIT - Starting...');
    
    // Show loading toast
    this.toastService.show({
      type: 'info',
      title: 'Loading',
      message: 'Initializing reminders module...',
      duration: 2000
    });
    
    this.agentId = this.sessionService.getAgentId();
    console.log('🚀 Retrieved agentId:', this.agentId);
    
    if (this.agentId) {
      console.log('✅ AgentId found, loading data...');
      this.loadData();
      console.log('✅ Checking today\'s reminders...');
      this.checkTodaysReminders();
    } else {
      console.error('❌ No agentId found in session');
      this.toastService.show({
        type: 'error',
        title: 'Authentication Error',
        message: 'Unable to load agent information. Please log in again.',
        duration: 6000
      });
    }
    
    console.log('🚀 COMPONENT INIT - Completed');
  }

  private initializeForm(): void {
    this.reminderForm = this.fb.group({
      ClientId: [''],
      ReminderType: ['Call', Validators.required],
      Title: ['', Validators.required],
      Description: [''],
      ReminderDate: ['', Validators.required],
      ReminderTime: ['09:00'],
      Priority: ['Medium'],
      EnableSMS: [true],
      EnableWhatsApp: [false],
      EnablePushNotification: [true],
      AdvanceNotice: ['1 day'],
      CustomMessage: [''],
      AutoSend: [false],
      Notes: ['']
    });

    console.log('📋 Form initialized with default values');
  }

  private async loadData(): Promise<void> {
    console.log('🔄 LOAD DATA - Starting...');
    console.log('🔄 AgentId:', this.agentId);
    
    if (!this.agentId) {
      console.error('❌ LOAD DATA - No agentId available');
      this.toastService.show({
        type: 'error',
        title: 'Error',
        message: 'No agent ID available for loading data.',
        duration: 4000
      });
      return;
    }

    try {
      this.isLoading = true;
      console.log('🔄 Loading state set to true');
      
      // Show loading toast
      this.toastService.show({
        type: 'info',
        title: 'Loading Data',
        message: 'Fetching your reminders and client information...',
        duration: 3000
      });
      
      console.log('🔄 Making parallel API calls...');
      
      const [remindersResponse, clientsResponse, statisticsResponse] = await Promise.all([
        this.remindersService.getAllReminders(this.agentId, {
          PageSize: this.pageSize,
          PageNumber: this.currentPage
        }).toPromise(),
        this.policyService.getClientsWithPolicies().toPromise(),
        this.remindersService.getStatistics(this.agentId).toPromise()
      ]);

      console.log('🔄 All API calls completed');

      // Process reminders
      if (remindersResponse) {
        console.log('✅ Processing reminders response...');
        this.reminders = remindersResponse.reminders || [];
        this.totalRecords = remindersResponse.totalRecords || 0;
        console.log('✅ Reminders set:', this.reminders.length, 'items');
        this.applyFilters();
        
        // Show success toast for reminders loaded
        this.toastService.show({
          type: 'success',
          title: 'Data Loaded',
          message: `Successfully loaded ${this.reminders.length} reminder${this.reminders.length !== 1 ? 's' : ''}`,
          duration: 3000
        });
      } else {
        console.warn('⚠️ No reminders response received');
        this.reminders = [];
        this.totalRecords = 0;
        this.toastService.show({
          type: 'info',
          title: 'No Reminders',
          message: 'No reminders found for your account.',
          duration: 3000
        });
      }

      // Process clients
      if (clientsResponse) {
        console.log('✅ Processing clients response...');
        this.clients = clientsResponse;
        console.log('✅ Clients set:', this.clients.length, 'items');
      } else {
        console.warn('⚠️ No clients response received');
        this.clients = [];
        this.toastService.show({
          type: 'warning',
          title: 'Clients Warning',
          message: 'Unable to load client information.',
          duration: 4000
        });
      }

      // Process statistics
      if (statisticsResponse) {
        console.log('✅ Processing statistics response...');
        this.statistics = statisticsResponse;
        console.log('✅ Statistics set:', this.statistics);
      } else {
        console.warn('⚠️ No statistics response received');
        this.statistics = null;
      }

    } catch (error) {
      console.error('❌ LOAD DATA - Error occurred:', error);
      
      this.toastService.show({
        type: 'error',
        title: 'Loading Failed',
        message: 'Failed to load reminders data. Please refresh the page and try again.',
        duration: 6000,
        actions: [
          {
            label: 'Refresh',
            style: 'primary',
            action: () => this.refreshData()
          },
          {
            label: 'Dismiss',
            style: 'secondary'
          }
        ]
      });
    } finally {
      this.isLoading = false;
      console.log('🔄 Loading state set to false');
      console.log('🔄 LOAD DATA - Completed');
    }
  }

  private checkTodaysReminders(): void {
    console.log('📅 CHECK TODAYS REMINDERS - Starting...');
    
    if (!this.agentId) {
      console.error('❌ CHECK TODAYS REMINDERS - No agentId available');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Today date:', today);
    
    this.remindersService.getRemindersByStatus(this.agentId, 'Active').subscribe({
      next: (reminders) => {
        console.log('✅ CHECK TODAYS REMINDERS - Received active reminders:', reminders?.length || 0);
        
        const todaysReminders = reminders.filter(r => 
          r.ReminderDate.startsWith(today) && r.Status === 'Active'
        );
        
        console.log('📅 Today\'s reminders filtered:', todaysReminders.length);

        if (todaysReminders.length > 0) {
          console.log('🔔 Showing today\'s reminders toast');
          this.toastService.show({
            type: 'reminder',
            title: 'Today\'s Reminders',
            message: `You have ${todaysReminders.length} reminder${todaysReminders.length > 1 ? 's' : ''} due today!`,
            duration: 8000,
            center: true,
            actions: [
              {
                label: 'View Today\'s Reminders',
                style: 'primary',
                action: () => this.filterByToday()
              },
              {
                label: 'Dismiss',
                style: 'secondary'
              }
            ]
          });
        } else {
          console.log('📅 No reminders due today');
          this.toastService.show({
            type: 'info',
            title: 'All Clear',
            message: 'No reminders due today. Great job staying organized!',
            duration: 4000
          });
        }
      },
      error: (error) => {
        console.error('❌ CHECK TODAYS REMINDERS - Error:', error);
        this.toastService.show({
          type: 'warning',
          title: 'Warning',
          message: 'Unable to check today\'s reminders. Please refresh to try again.',
          duration: 5000
        });
      }
    });
  }

  // Form methods
  showAddReminderForm(): void {
    this.showAddForm = true;
    this.isEditing = false;
    this.editingReminderId = null;
    
    // Reset form with proper defaults
    this.reminderForm.reset();
    this.reminderForm.patchValue({
      ReminderType: 'Call',
      Priority: 'Medium',
      EnableSMS: true,
      EnableWhatsApp: false,
      EnablePushNotification: true,
      ReminderTime: '09:00',
      AdvanceNotice: '1 day',
      AutoSend: false
    });
    
    console.log('📋 Add form shown with reset values');
    this.toastService.show({
      type: 'info',
      title: 'New Reminder',
      message: 'Fill out the form to create a new reminder.',
      duration: 3000
    });
  }

  hideAddForm(): void {
    this.showAddForm = false;
    this.isEditing = false;
    this.editingReminderId = null;
    this.reminderForm.reset();
    
    this.toastService.show({
      type: 'info',
      message: 'Form cancelled.',
      duration: 2000
    });
  }

  editReminder(reminder: Reminder): void {
    console.log('✏️ EDIT REMINDER - Starting...', reminder);
    
    this.showAddForm = true;
    this.isEditing = true;
    this.editingReminderId = reminder.ReminderId;

    const reminderDate = new Date(reminder.ReminderDate).toISOString().split('T')[0];
    
    let reminderTime = reminder.ReminderTime || '09:00';
    if (reminderTime.length > 5) {
      reminderTime = reminderTime.substring(0, 5);
    }
    
    this.reminderForm.patchValue({
      ClientId: reminder.ClientId || '',
      ReminderType: reminder.ReminderType,
      Title: reminder.Title,
      Description: reminder.Description || '',
      ReminderDate: reminderDate,
      ReminderTime: reminderTime,
      Priority: reminder.Priority,
      EnableSMS: reminder.EnableSMS === true,
      EnableWhatsApp: reminder.EnableWhatsApp === true,
      EnablePushNotification: reminder.EnablePushNotification === true,
      AdvanceNotice: reminder.AdvanceNotice,
      CustomMessage: reminder.CustomMessage || '',
      AutoSend: reminder.AutoSend === true,
      Notes: reminder.Notes || ''
    });
    
    this.toastService.show({
      type: 'info',
      title: 'Edit Mode',
      message: `Editing reminder: "${reminder.Title}"`,
      duration: 3000
    });
  }

  submitReminder(): void {
    console.log('🎯 SUBMIT REMINDER - Starting validation...');
    
    if (this.reminderForm.invalid || !this.agentId) {
      console.error('❌ SUBMIT REMINDER - Validation failed');
      
      // Show detailed validation errors
      const errors: string[] = [];
      Object.keys(this.reminderForm.controls).forEach(key => {
        const control = this.reminderForm.get(key);
        if (control && control.invalid) {
          if (control.errors?.['required']) {
            errors.push(`${key} is required`);
          }
        }
      });
      
      this.toastService.show({
        type: 'error',
        title: 'Validation Error',
        message: errors.length > 0 ? errors.join(', ') : 'Please fill in all required fields correctly.',
        duration: 5000
      });
      return;
    }

    const formValue = this.reminderForm.value;
    console.log('🎯 Form value:', formValue);

    try {
      const convertedDate = new Date(formValue.ReminderDate).toISOString();
      console.log('🎯 Converted date:', convertedDate);

      if (this.isEditing && this.editingReminderId) {
        console.log('🎯 Calling updateReminder...');
        this.updateReminder(formValue);
      } else {
        console.log('🎯 Calling createReminder...');
        this.createReminder(formValue);
      }
    } catch (dateError) {
      console.error('❌ Date conversion error:', dateError);
      this.toastService.show({
        type: 'error',
        title: 'Invalid Date',
        message: 'Invalid date format. Please check the reminder date.',
        duration: 5000
      });
    }
  }

  private createReminder(formValue: any): void {
    console.log('📝 CREATE REMINDER - Starting...');

    if (!this.agentId) {
      this.toastService.show({
        type: 'error',
        title: 'Error',
        message: 'No agent ID available.',
        duration: 4000
      });
      return;
    }

    // Show creating toast
    this.toastService.show({
      type: 'info',
      title: 'Creating Reminder',
      message: 'Please wait while we create your reminder...',
      duration: 3000
    });

    const reminderTime = this.formatTimeForDatabase(formValue.ReminderTime);
    
    const request: CreateReminderRequest = {
      ClientId: formValue.ClientId || null,
      ReminderType: formValue.ReminderType,
      Title: formValue.Title,
      Description: formValue.Description || null,
      ReminderDate: new Date(formValue.ReminderDate).toISOString(),
      ReminderTime: reminderTime,
      Priority: formValue.Priority || 'Medium',
      EnableSMS: formValue.EnableSMS === true,
      EnableWhatsApp: formValue.EnableWhatsApp === true,
      EnablePushNotification: formValue.EnablePushNotification === true,
      AdvanceNotice: formValue.AdvanceNotice || '1 day',
      CustomMessage: formValue.CustomMessage || null,
      AutoSend: formValue.AutoSend === true,
      Notes: formValue.Notes || null
    };
    
    console.log('📝 Final request object:', request);

    if (!request.Title || !request.ReminderDate || !request.ReminderType) {
      this.toastService.show({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.',
        duration: 4000
      });
      return;
    }

    if (!/^\d{2}:\d{2}:\d{2}$/.test(reminderTime)) {
      this.toastService.show({
        type: 'error',
        title: 'Invalid Time Format',
        message: 'Invalid time format. Please use HH:MM format (e.g., 09:30).',
        duration: 5000
      });
      return;
    }

    this.remindersService.createReminder(this.agentId, request).subscribe({
      next: (reminder) => {
        console.log('✅ CREATE REMINDER - Success:', reminder);
        this.toastService.show({
          type: 'success',
          title: 'Reminder Created',
          message: `Reminder "${request.Title}" has been created successfully!`,
          duration: 4000,
          actions: [
            {
              label: 'View All',
              style: 'primary',
              action: () => this.refreshData()
            }
          ]
        });
        this.hideAddForm();
        this.refreshData(); // Refresh data after creation
      },
      error: (error) => {
        console.error('❌ CREATE REMINDER - Error:', error);
        
        let errorMessage = 'Failed to create reminder';
        if (error.message && error.message.includes('time')) {
          errorMessage = 'Invalid time format. Please use HH:MM format (e.g., 09:30).';
        } else if (error.message) {
          errorMessage = `Failed to create reminder: ${error.message}`;
        }
        
        this.toastService.show({
          type: 'error',
          title: 'Creation Failed',
          message: errorMessage,
          duration: 6000,
          actions: [
            {
              label: 'Retry',
              style: 'primary',
              action: () => this.submitReminder()
            }
          ]
        });
      }
    });
  }

  private updateReminder(formValue: any): void {
    console.log('✏️ UPDATE REMINDER - Starting...');
    
    if (!this.agentId || !this.editingReminderId) {
      this.toastService.show({
        type: 'error',
        title: 'Error',
        message: 'Missing required information for update.',
        duration: 4000
      });
      return;
    }

    // Show updating toast
    this.toastService.show({
      type: 'info',
      title: 'Updating Reminder',
      message: 'Please wait while we update your reminder...',
      duration: 3000
    });

    const reminderTime = this.formatTimeForDatabase(formValue.ReminderTime);

    const request: UpdateReminderRequest = {
      Title: formValue.Title,
      Description: formValue.Description || null,
      ReminderDate: new Date(formValue.ReminderDate).toISOString(),
      ReminderTime: reminderTime,
      Priority: formValue.Priority,
      EnableSMS: formValue.EnableSMS === true,
      EnableWhatsApp: formValue.EnableWhatsApp === true,
      EnablePushNotification: formValue.EnablePushNotification === true,
      AdvanceNotice: formValue.AdvanceNotice,
      CustomMessage: formValue.CustomMessage || null,
      AutoSend: formValue.AutoSend === true,
      Notes: formValue.Notes || null
    };

    if (!/^\d{2}:\d{2}:\d{2}$/.test(reminderTime)) {
      this.toastService.show({
        type: 'error',
        title: 'Invalid Time Format',
        message: 'Invalid time format. Please use HH:MM format (e.g., 09:30).',
        duration: 5000
      });
      return;
    }

    this.remindersService.updateReminder(this.agentId, this.editingReminderId, request).subscribe({
      next: (reminder) => {
        console.log('✅ UPDATE REMINDER - Success:', reminder);
        this.toastService.show({
          type: 'success',
          title: 'Reminder Updated',
          message: `Reminder "${request.Title}" has been updated successfully!`,
          duration: 4000
        });
        this.hideAddForm();
        this.refreshData(); // Refresh data after update
      },
      error: (error) => {
        console.error('❌ UPDATE REMINDER - Error:', error);
        
        let errorMessage = 'Failed to update reminder';
        if (error.message && error.message.includes('time')) {
          errorMessage = 'Invalid time format. Please use HH:MM format (e.g., 09:30).';
        } else if (error.message) {
          errorMessage = `Failed to update reminder: ${error.message}`;
        }
        
        this.toastService.show({
          type: 'error',
          title: 'Update Failed',
          message: errorMessage,
          duration: 6000,
          actions: [
            {
              label: 'Retry',
              style: 'primary',
              action: () => this.submitReminder()
            }
          ]
        });
      }
    });
  }

  // Action methods
  completeReminder(reminder: Reminder): void {
    if (!this.agentId) {
      this.toastService.show({
        type: 'error',
        title: 'Error',
        message: 'Unable to complete reminder. No agent ID available.',
        duration: 4000
      });
      return;
    }

    this.toastService.confirm(
      `Mark "${reminder.Title}" as completed?`, 
      ['Complete', 'Cancel']
    ).subscribe({
      next: (result) => {
        if (result === 'complete') {
          // Show processing toast
          this.toastService.show({
            type: 'info',
            title: 'Processing',
            message: 'Marking reminder as completed...',
            duration: 2000
          });

          this.remindersService.completeReminder(this.agentId!, reminder.ReminderId).subscribe({
            next: () => {
              this.toastService.show({
                type: 'success',
                title: 'Reminder Completed',
                message: `"${reminder.Title}" has been marked as completed!`,
                duration: 4000
              });
              this.refreshData(); // Refresh data after completion
            },
            error: (error) => {
              console.error('Error completing reminder:', error);
              this.toastService.show({
                type: 'error',
                title: 'Completion Failed',
                message: 'Failed to complete reminder. Please try again.',
                duration: 5000,
                actions: [
                  {
                    label: 'Retry',
                    style: 'primary',
                    action: () => this.completeReminder(reminder)
                  }
                ]
              });
            }
          });
        }
      }
    });
  }

  deleteReminder(reminder: Reminder): void {
    if (!this.agentId) {
      this.toastService.show({
        type: 'error',
        title: 'Error',
        message: 'Unable to delete reminder. No agent ID available.',
        duration: 4000
      });
      return;
    }

    this.toastService.confirm(
      `Are you sure you want to delete "${reminder.Title}"? This action cannot be undone.`, 
      ['Delete', 'Cancel']
    ).subscribe({
      next: (result) => {
        if (result === 'delete') {
          // Show processing toast
          this.toastService.show({
            type: 'info',
            title: 'Deleting',
            message: 'Deleting reminder...',
            duration: 2000
          });

          this.remindersService.deleteReminder(this.agentId!, reminder.ReminderId).subscribe({
            next: () => {
              this.toastService.show({
                type: 'success',
                title: 'Reminder Deleted',
                message: `"${reminder.Title}" has been permanently deleted!`,
                duration: 4000
              });
              this.refreshData(); // Refresh data after deletion
            },
            error: (error) => {
              console.error('Error deleting reminder:', error);
              this.toastService.show({
                type: 'error',
                title: 'Deletion Failed',
                message: 'Failed to delete reminder. Please try again.',
                duration: 5000,
                actions: [
                  {
                    label: 'Retry',
                    style: 'primary',
                    action: () => this.deleteReminder(reminder)
                  }
                ]
              });
            }
          });
        }
      }
    });
  }

  // Filter and search methods
  applyFilters(): void {
    let filtered = [...this.reminders];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(reminder =>
        reminder.Title.toLowerCase().includes(term) ||
        reminder.Description?.toLowerCase().includes(term) ||
        reminder.ClientName?.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(reminder => reminder.Status === this.statusFilter);
    }

    if (this.typeFilter) {
      filtered = filtered.filter(reminder => reminder.ReminderType === this.typeFilter);
    }

    if (this.priorityFilter) {
      filtered = filtered.filter(reminder => reminder.Priority === this.priorityFilter);
    }

    this.filteredReminders = filtered;
    
    // Show filter results toast
    if (this.searchTerm || this.statusFilter || this.typeFilter || this.priorityFilter) {
      this.toastService.show({
        type: 'info',
        title: 'Filters Applied',
        message: `Showing ${filtered.length} of ${this.reminders.length} reminders`,
        duration: 3000
      });
    }
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.typeFilter = '';
    this.priorityFilter = '';
    this.applyFilters();
    
    this.toastService.show({
      type: 'info',
      title: 'Filters Cleared',
      message: 'All filters have been removed. Showing all reminders.',
      duration: 3000
    });
  }

  filterByToday(): void {
    const today = new Date().toISOString().split('T')[0];
    this.filteredReminders = this.reminders.filter(reminder =>
      reminder.ReminderDate.startsWith(today) && reminder.Status === 'Active'
    );
    
    this.toastService.show({
      type: 'info',
      title: 'Today\'s Reminders',
      message: `Showing ${this.filteredReminders.length} reminder${this.filteredReminders.length !== 1 ? 's' : ''} due today`,
      duration: 4000
    });
  }

  // Refresh data method
  refreshData(): void {
    console.log('🔄 Refreshing data...');
    this.toastService.show({
      type: 'info',
      title: 'Refreshing',
      message: 'Updating your reminders...',
      duration: 2000
    });
    
    this.loadData().then(() => {
      this.toastService.show({
        type: 'success',
        title: 'Data Refreshed',
        message: 'Your reminders have been updated!',
        duration: 3000
      });
    });
  }

  // Utility methods
  getTypeIcon(type: string): string {
    const typeConfig = this.reminderTypes.find(t => t.value === type);
    return typeConfig?.icon || 'fa-bell';
  }

  getPriorityClass(priority: string): string {
    const priorityConfig = this.priorities.find(p => p.value === priority);
    return priorityConfig?.class || 'badge-secondary';
  }

  getStatusClass(status: string): string {
    const statusConfig = this.statuses.find(s => s.value === status);
    return statusConfig?.class || 'badge-secondary';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(dateString: string, timeString?: string): string {
    const date = new Date(dateString);
    let result = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    if (timeString) {
      result += ` at ${timeString}`;
    }
    
    return result;
  }

  isOverdue(reminder: Reminder): boolean {
    if (reminder.Status !== 'Active') return false;
    
    const reminderDateTime = new Date(`${reminder.ReminderDate}T${reminder.ReminderTime || '00:00'}`);
    return reminderDateTime < new Date();
  }

  isDueToday(reminder: Reminder): boolean {
    const today = new Date().toISOString().split('T')[0];
    return reminder.ReminderDate.startsWith(today) && reminder.Status === 'Active';
  }

  getClientName(clientId: string): string {
    if (!clientId) return 'No client selected';
    
    const client = this.clients.find(c => c.clientId === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
  }

  // Pagination methods
  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  get paginatedReminders(): Reminder[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredReminders.slice(startIndex, startIndex + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      
      this.toastService.show({
        type: 'info',
        title: 'Navigation',
        message: `Loading page ${page} of ${this.totalPages}...`,
        duration: 2000
      });
      
      this.loadData().then(() => {
        this.toastService.show({
          type: 'success',
          title: 'Page Loaded',
          message: `Showing page ${page} of ${this.totalPages}`,
          duration: 2000
        });
      });
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      
      this.toastService.show({
        type: 'info',
        title: 'Navigation',
        message: 'Loading previous page...',
        duration: 1500
      });
      
      this.loadData();
    } else {
      this.toastService.show({
        type: 'warning',
        title: 'Navigation',
        message: 'You are already on the first page.',
        duration: 2000
      });
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      
      this.toastService.show({
        type: 'info',
        title: 'Navigation',
        message: 'Loading next page...',
        duration: 1500
      });
      
      this.loadData();
    } else {
      this.toastService.show({
        type: 'warning',
        title: 'Navigation',
        message: 'You are already on the last page.',
        duration: 2000
      });
    }
  }

  // Bulk actions with toasts
  bulkCompleteReminders(reminders: Reminder[]): void {
    if (!this.agentId || reminders.length === 0) {
      this.toastService.show({
        type: 'warning',
        title: 'No Selection',
        message: 'Please select reminders to complete.',
        duration: 3000
      });
      return;
    }

    this.toastService.confirm(
      `Mark ${reminders.length} reminder${reminders.length > 1 ? 's' : ''} as completed?`, 
      ['Complete All', 'Cancel']
    ).subscribe({
      next: (result) => {
        if (result === 'complete all') {
          let completed = 0;
          let failed = 0;

          this.toastService.show({
            type: 'info',
            title: 'Bulk Operation',
            message: `Processing ${reminders.length} reminders...`,
            duration: 3000
          });

          reminders.forEach((reminder, index) => {
            this.remindersService.completeReminder(this.agentId!, reminder.ReminderId).subscribe({
              next: () => {
                completed++;
                if (completed + failed === reminders.length) {
                  this.showBulkOperationResult(completed, failed, 'completed');
                  this.refreshData();
                }
              },
              error: () => {
                failed++;
                if (completed + failed === reminders.length) {
                  this.showBulkOperationResult(completed, failed, 'completed');
                  this.refreshData();
                }
              }
            });
          });
        }
      }
    });
  }

  bulkDeleteReminders(reminders: Reminder[]): void {
    if (!this.agentId || reminders.length === 0) {
      this.toastService.show({
        type: 'warning',
        title: 'No Selection',
        message: 'Please select reminders to delete.',
        duration: 3000
      });
      return;
    }

    this.toastService.confirm(
      `Permanently delete ${reminders.length} reminder${reminders.length > 1 ? 's' : ''}? This action cannot be undone.`, 
      ['Delete All', 'Cancel']
    ).subscribe({
      next: (result) => {
        if (result === 'delete all') {
          let deleted = 0;
          let failed = 0;

          this.toastService.show({
            type: 'info',
            title: 'Bulk Deletion',
            message: `Deleting ${reminders.length} reminders...`,
            duration: 3000
          });

          reminders.forEach((reminder) => {
            this.remindersService.deleteReminder(this.agentId!, reminder.ReminderId).subscribe({
              next: () => {
                deleted++;
                if (deleted + failed === reminders.length) {
                  this.showBulkOperationResult(deleted, failed, 'deleted');
                  this.refreshData();
                }
              },
              error: () => {
                failed++;
                if (deleted + failed === reminders.length) {
                  this.showBulkOperationResult(deleted, failed, 'deleted');
                  this.refreshData();
                }
              }
            });
          });
        }
      }
    });
  }

  private showBulkOperationResult(successful: number, failed: number, operation: string): void {
    if (failed === 0) {
      this.toastService.show({
        type: 'success',
        title: `Bulk ${operation.charAt(0).toUpperCase() + operation.slice(1)} Successful`,
        message: `Successfully ${operation} ${successful} reminder${successful > 1 ? 's' : ''}!`,
        duration: 5000
      });
    } else if (successful === 0) {
      this.toastService.show({
        type: 'error',
        title: `Bulk ${operation.charAt(0).toUpperCase() + operation.slice(1)} Failed`,
        message: `Failed to ${operation.slice(0, -1)} ${failed} reminder${failed > 1 ? 's' : ''}. Please try again.`,
        duration: 6000
      });
    } else {
      this.toastService.show({
        type: 'warning',
        title: `Partial ${operation.charAt(0).toUpperCase() + operation.slice(1)}`,
        message: `${successful} reminder${successful > 1 ? 's' : ''} ${operation} successfully, ${failed} failed.`,
        duration: 6000,
        actions: [
          {
            label: 'Retry Failed',
            style: 'primary',
            action: () => this.refreshData()
          }
        ]
      });
    }
  }

  // Export functionality with toasts
  exportReminders(): void {
    this.toastService.show({
      type: 'info',
      title: 'Exporting',
      message: 'Preparing your reminders for export...',
      duration: 3000
    });

    try {
      const exportData = this.reminders.map(reminder => ({
        Title: reminder.Title,
        Type: reminder.ReminderType,
        Date: this.formatDate(reminder.ReminderDate),
        Time: reminder.ReminderTime,
        Priority: reminder.Priority,
        Status: reminder.Status,
        Client: reminder.ClientName || 'No Client',
        Description: reminder.Description || '',
        Notes: reminder.Notes || ''
      }));

      const csvContent = this.convertToCSV(exportData);
      this.downloadCSV(csvContent, `reminders_${new Date().toISOString().split('T')[0]}.csv`);
      
      this.toastService.show({
        type: 'success',
        title: 'Export Successful',
        message: `Successfully exported ${exportData.length} reminder${exportData.length > 1 ? 's' : ''} to CSV!`,
        duration: 4000
      });
    } catch (error) {
      console.error('Export error:', error);
      this.toastService.show({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export reminders. Please try again.',
        duration: 5000
      });
    }
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return `"${value || ''}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  private downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Statistics refresh
  refreshStatistics(): void {
    if (!this.agentId) {
      this.toastService.show({
        type: 'error',
        title: 'Error',
        message: 'Cannot refresh statistics. No agent ID available.',
        duration: 4000
      });
      return;
    }

    this.toastService.show({
      type: 'info',
      title: 'Refreshing Statistics',
      message: 'Updating your reminder statistics...',
      duration: 2000
    });

    this.remindersService.getStatistics(this.agentId).subscribe({
      next: (statistics) => {
        this.statistics = statistics;
        this.toastService.show({
          type: 'success',
          title: 'Statistics Updated',
          message: 'Your reminder statistics have been refreshed!',
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error refreshing statistics:', error);
        this.toastService.show({
          type: 'error',
          title: 'Refresh Failed',
          message: 'Failed to refresh statistics. Please try again.',
          duration: 5000
        });
      }
    });
  }

  // Time formatting helper
  private formatTimeForDatabase(timeString: string): string {
    console.log('🕐 Formatting time:', timeString, 'Type:', typeof timeString);
    
    if (!timeString) {
      console.log('🕐 No time provided, using default 09:00:00');
      return '09:00:00';
    }

    if (typeof timeString === 'string') {
      timeString = timeString.trim();
      
      if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
        console.log('🕐 Already in HH:MM:SS format:', timeString);
        return timeString;
      }
      
      if (/^\d{1,2}:\d{2}$/.test(timeString)) {
        const [hours, minutes] = timeString.split(':');
        const formattedHours = hours.padStart(2, '0');
        const formattedMinutes = minutes.padStart(2, '0');
        const formatted = `${formattedHours}:${formattedMinutes}:00`;
        console.log('🕐 Converted HH:MM to HH:MM:SS:', timeString, '->', formatted);
        return formatted;
      }
      
      if (/^\d{1,2}$/.test(timeString)) {
        const formatted = `${timeString.padStart(2, '0')}:00:00`;
        console.log('🕐 Converted hours to HH:MM:SS:', timeString, '->', formatted);
        return formatted;
      }
    }

    try {
      const date = new Date(`1970-01-01T${timeString}`);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const formatted = `${hours}:${minutes}:${seconds}`;
        console.log('🕐 Parsed from date:', timeString, '->', formatted);
        return formatted;
      }
    } catch (error) {
      console.warn('🕐 Could not parse time as date:', error);
    }

    console.warn('🕐 Could not parse time format, using default 09:00:00. Input was:', timeString);
    return '09:00:00';
  }

  // Session timeout handler
  handleSessionTimeout(): void {
    this.toastService.show({
      type: 'warning',
      title: 'Session Expiring',
      message: 'Your session will expire in 5 minutes. Save your work.',
      duration: 10000,
      center: true,
      actions: [
        {
          label: 'Extend Session',
          style: 'primary',
          action: () => {
            // Extend session logic here
            this.toastService.show({
              type: 'success',
              title: 'Session Extended',
              message: 'Your session has been extended.',
              duration: 3000
            });
          }
        },
        {
          label: 'Save & Logout',
          style: 'secondary',
          action: () => {
            // Save and logout logic here
            this.toastService.show({
              type: 'info',
              title: 'Logging Out',
              message: 'Saving your work and logging out...',
              duration: 3000
            });
          }
        }
      ]
    });
  }
}