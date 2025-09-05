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
        message: 'Unable to load agent information. Please log in again.',
        duration: 5000
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
      ReminderTime: ['09:00'], // Keep as HH:MM for HTML input
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
      return;
    }

    try {
      this.isLoading = true;
      console.log('🔄 Loading state set to true');
      
      console.log('🔄 Making parallel API calls...');
      
      // Log each API call attempt
      console.log('🔄 API Call 1: getAllReminders with filters:', {
        PageSize: this.pageSize,
        PageNumber: this.currentPage
      });
      
      console.log('🔄 API Call 2: getClientsWithPolicies');
      console.log('🔄 API Call 3: getStatistics');
      
      const [remindersResponse, clientsResponse, statisticsResponse] = await Promise.all([
        this.remindersService.getAllReminders(this.agentId, {
          PageSize: this.pageSize,
          PageNumber: this.currentPage
        }).toPromise(),
        this.policyService.getClientsWithPolicies().toPromise(),
        this.remindersService.getStatistics(this.agentId).toPromise()
      ]);

      console.log('🔄 All API calls completed');
      console.log('🔄 Reminders response:', remindersResponse);
      console.log('🔄 Clients response:', clientsResponse);
      console.log('🔄 Statistics response:', statisticsResponse);

      // Process reminders
      if (remindersResponse) {
        console.log('✅ Processing reminders response...');
        this.reminders = remindersResponse.reminders || [];
        this.totalRecords = remindersResponse.totalRecords || 0;
        console.log('✅ Reminders set:', this.reminders.length, 'items');
        console.log('✅ Total records:', this.totalRecords);
        this.applyFilters();
        console.log('✅ Filters applied');
      } else {
        console.warn('⚠️ No reminders response received');
        this.reminders = [];
        this.totalRecords = 0;
      }

      // Process clients
      if (clientsResponse) {
        console.log('✅ Processing clients response...');
        this.clients = clientsResponse;
        console.log('✅ Clients set:', this.clients.length, 'items');
      } else {
        console.warn('⚠️ No clients response received');
        this.clients = [];
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
      console.error('❌ LOAD DATA - Error occurred:');
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      this.toastService.show({
        type: 'error',
        message: 'Failed to load reminders data. Please try again.',
        duration: 5000
      });
    } finally {
      this.isLoading = false;
      console.log('🔄 Loading state set to false');
      console.log('🔄 LOAD DATA - Completed');
    }
  }

  private checkTodaysReminders(): void {
    console.log('📅 CHECK TODAYS REMINDERS - Starting...');
    console.log('📅 AgentId:', this.agentId);
    
    if (!this.agentId) {
      console.error('❌ CHECK TODAYS REMINDERS - No agentId available');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Today date:', today);
    
    this.remindersService.getRemindersByStatus(this.agentId, 'Active').subscribe({
      next: (reminders) => {
        console.log('✅ CHECK TODAYS REMINDERS - Received active reminders:', reminders?.length || 0);
        console.log('✅ Active reminders:', reminders);
        
        const todaysReminders = reminders.filter(r => 
          r.ReminderDate.startsWith(today) && r.Status === 'Active'
        );
        
        console.log('📅 Today\'s reminders filtered:', todaysReminders.length);
        console.log('📅 Today\'s reminders:', todaysReminders);

        if (todaysReminders.length > 0) {
          console.log('🔔 Showing today\'s reminders toast');
          this.toastService.show({
            type: 'reminder',
            title: 'Today\'s Reminders',
            message: `You have ${todaysReminders.length} reminder${todaysReminders.length > 1 ? 's' : ''} due today!`,
            duration: 5000,
            actions: [
              {
                label: 'View',
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
        }
      },
      error: (error) => {
        console.error('❌ CHECK TODAYS REMINDERS - Error:');
        console.error('❌ Error:', error);
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
      ReminderTime: '09:00', // Ensure proper time format
      AdvanceNotice: '1 day',
      AutoSend: false
    });
    
    console.log('📋 Add form shown with reset values');
  }

  hideAddForm(): void {
    this.showAddForm = false;
    this.isEditing = false;
    this.editingReminderId = null;
    this.reminderForm.reset();
  }

  editReminder(reminder: Reminder): void {
    console.log('✏️ EDIT REMINDER - Starting...');
    console.log('✏️ Reminder data:', reminder);
    
    this.showAddForm = true;
    this.isEditing = true;
    this.editingReminderId = reminder.ReminderId;

    const reminderDate = new Date(reminder.ReminderDate).toISOString().split('T')[0];
    
    // Format the time properly for the HTML time input
    let reminderTime = reminder.ReminderTime || '09:00';
    if (reminderTime.length > 5) {
      // If it's HH:MM:SS, convert to HH:MM for HTML input
      reminderTime = reminderTime.substring(0, 5);
    }
    
    console.log('✏️ Date conversion:', reminder.ReminderDate, '->', reminderDate);
    console.log('✏️ Time conversion:', reminder.ReminderTime, '->', reminderTime);
    
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
    
    console.log('✏️ Form patched with reminder data');
  }

  submitReminder(): void {
    console.log('🎯 SUBMIT REMINDER - Starting validation...');
    console.log('🎯 Form valid:', this.reminderForm.valid);
    console.log('🎯 Form errors:', this.reminderForm.errors);
    console.log('🎯 AgentId:', this.agentId);
    
    // Log individual field validity
    Object.keys(this.reminderForm.controls).forEach(key => {
      const control = this.reminderForm.get(key);
      if (control && control.invalid) {
        console.log(`🎯 Invalid field - ${key}:`, control.errors);
      }
    });

    if (this.reminderForm.invalid || !this.agentId) {
      console.error('❌ SUBMIT REMINDER - Validation failed');
      this.toastService.show({
        type: 'error',
        message: 'Please fill in all required fields correctly.',
        duration: 5000
      });
      return;
    }

    const formValue = this.reminderForm.value;
    console.log('🎯 Raw form value:', JSON.stringify(formValue, null, 2));

    // Log the date conversion process
    console.log('🎯 Original ReminderDate:', formValue.ReminderDate);
    console.log('🎯 Date type:', typeof formValue.ReminderDate);
    
    try {
      const convertedDate = new Date(formValue.ReminderDate).toISOString();
      console.log('🎯 Converted date:', convertedDate);
      
      // Log each field type and value
      Object.keys(formValue).forEach(key => {
        console.log(`🎯 Field ${key}: ${formValue[key]} (type: ${typeof formValue[key]})`);
      });

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
        message: 'Invalid date format. Please check the reminder date.',
        duration: 5000
      });
    }
  }

 
    // Create the request object with proper formatting
    // Replace your existing createReminder method with this updated version

private createReminder(formValue: any): void {
  console.log('📝 CREATE REMINDER - Component method starting...');
  console.log('📝 AgentId:', this.agentId);
  console.log('📝 Form value received:', JSON.stringify(formValue, null, 2));

  if (!this.agentId) {
    console.error('❌ CREATE REMINDER - No agentId available');
    return;
  }

  // FIXED: Use the new formatTimeForDatabase method
  const reminderTime = this.formatTimeForDatabase(formValue.ReminderTime);
  console.log('📝 Time conversion:', formValue.ReminderTime, '->', reminderTime);

  // Create the request object with proper formatting
  const request: CreateReminderRequest = {
    ClientId: formValue.ClientId || null,
    ReminderType: formValue.ReminderType,
    Title: formValue.Title,
    Description: formValue.Description || null,
    ReminderDate: new Date(formValue.ReminderDate).toISOString(),
    ReminderTime: reminderTime, // Now using properly formatted time
    Priority: formValue.Priority || 'Medium',
    EnableSMS: formValue.EnableSMS === true,
    EnableWhatsApp: formValue.EnableWhatsApp === true,
    EnablePushNotification: formValue.EnablePushNotification === true,
    AdvanceNotice: formValue.AdvanceNotice || '1 day',
    CustomMessage: formValue.CustomMessage || null,
    AutoSend: formValue.AutoSend === true,
    Notes: formValue.Notes || null
  };
  
  console.log('📝 Final request object:', JSON.stringify(request, null, 2));

  // Validate the request before sending
  if (!request.Title || !request.ReminderDate || !request.ReminderType) {
    console.error('❌ CREATE REMINDER - Missing required fields in final request');
    this.toastService.show({
      type: 'error',
      message: 'Please fill in all required fields.',
      duration: 5000
    });
    return;
  }

  // Additional validation for time format
  if (!/^\d{2}:\d{2}:\d{2}$/.test(reminderTime)) {
    console.error('❌ CREATE REMINDER - Invalid time format after formatting:', reminderTime);
    this.toastService.show({
      type: 'error',
      message: 'Invalid time format. Please check the time field.',
      duration: 5000
    });
    return;
  }

  console.log('📝 Sending request to service...');
  this.remindersService.createReminder(this.agentId, request).subscribe({
    next: (reminder) => {
      console.log('✅ CREATE REMINDER - Component received success:', reminder);
      this.toastService.show({
        type: 'success',
        message: 'Reminder created successfully!',
        duration: 5000
      });
      this.hideAddForm();
      this.loadData();
    },
    error: (error) => {
      console.error('❌ CREATE REMINDER - Component received error:');
      console.error('❌ Error object:', error);
      console.error('❌ Error message:', error.message);
      
      // More specific error messages
      let errorMessage = 'Failed to create reminder';
      if (error.message && error.message.includes('time')) {
        errorMessage = 'Invalid time format. Please use HH:MM format (e.g., 09:30).';
      } else if (error.message) {
        errorMessage = `Failed to create reminder: ${error.message}`;
      }
      
      this.toastService.show({
        type: 'error',
        message: errorMessage,
        duration: 5000
      });
    }
  });
}

  // Replace your existing updateReminder method with this updated version

private updateReminder(formValue: any): void {
  console.log('✏️ UPDATE REMINDER - Component method starting...');
  
  if (!this.agentId || !this.editingReminderId) {
    console.error('❌ UPDATE REMINDER - Missing agentId or reminderId');
    return;
  }

  // FIXED: Use the new formatTimeForDatabase method
  const reminderTime = this.formatTimeForDatabase(formValue.ReminderTime);
  console.log('✏️ Time conversion:', formValue.ReminderTime, '->', reminderTime);

  const request: UpdateReminderRequest = {
    Title: formValue.Title,
    Description: formValue.Description || null,
    ReminderDate: new Date(formValue.ReminderDate).toISOString(),
    ReminderTime: reminderTime, // Now using properly formatted time
    Priority: formValue.Priority,
    EnableSMS: formValue.EnableSMS === true,
    EnableWhatsApp: formValue.EnableWhatsApp === true,
    EnablePushNotification: formValue.EnablePushNotification === true,
    AdvanceNotice: formValue.AdvanceNotice,
    CustomMessage: formValue.CustomMessage || null,
    AutoSend: formValue.AutoSend === true,
    Notes: formValue.Notes || null
  };

  console.log('✏️ Final update request:', JSON.stringify(request, null, 2));

  // Validate time format
  if (!/^\d{2}:\d{2}:\d{2}$/.test(reminderTime)) {
    console.error('❌ UPDATE REMINDER - Invalid time format after formatting:', reminderTime);
    this.toastService.show({
      type: 'error',
      message: 'Invalid time format. Please check the time field.',
      duration: 5000
    });
    return;
  }

  this.remindersService.updateReminder(this.agentId, this.editingReminderId, request).subscribe({
    next: (reminder) => {
      console.log('✅ UPDATE REMINDER - Success:', reminder);
      this.toastService.show({
        type: 'success',
        message: 'Reminder updated successfully!',
        duration: 5000
      });
      this.hideAddForm();
      this.loadData();
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
        message: errorMessage,
        duration: 5000
      });
    }
  });
}
  // Action methods
  completeReminder(reminder: Reminder): void {
    if (!this.agentId) return;

    this.toastService.confirm('Mark this reminder as completed?', ['Yes', 'No']).subscribe({
      next: (result) => {
        if (result === 'yes') {
          this.remindersService.completeReminder(this.agentId!, reminder.ReminderId).subscribe({
            next: () => {
              this.toastService.show({
                type: 'success',
                message: 'Reminder marked as completed!',
                duration: 5000
              });
              this.loadData();
            },
            error: (error) => {
              console.error('Error completing reminder:', error);
              this.toastService.show({
                type: 'error',
                message: 'Failed to complete reminder. Please try again.',
                duration: 5000
              });
            }
          });
        }
      }
    });
  }

  deleteReminder(reminder: Reminder): void {
    if (!this.agentId) return;

    this.toastService.confirm('Are you sure you want to delete this reminder?', ['Delete', 'Cancel']).subscribe({
      next: (result) => {
        if (result === 'delete') {
          this.remindersService.deleteReminder(this.agentId!, reminder.ReminderId).subscribe({
            next: () => {
              this.toastService.show({
                type: 'success',
                message: 'Reminder deleted successfully!',
                duration: 5000
              });
              this.loadData();
            },
            error: (error) => {
              console.error('Error deleting reminder:', error);
              this.toastService.show({
                type: 'error',
                message: 'Failed to delete reminder. Please try again.',
                duration: 5000
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

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(reminder =>
        reminder.Title.toLowerCase().includes(term) ||
        reminder.Description?.toLowerCase().includes(term) ||
        reminder.ClientName?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter) {
      filtered = filtered.filter(reminder => reminder.Status === this.statusFilter);
    }

    // Type filter
    if (this.typeFilter) {
      filtered = filtered.filter(reminder => reminder.ReminderType === this.typeFilter);
    }

    // Priority filter
    if (this.priorityFilter) {
      filtered = filtered.filter(reminder => reminder.Priority === this.priorityFilter);
    }

    this.filteredReminders = filtered;
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
  }

  filterByToday(): void {
    const today = new Date().toISOString().split('T')[0];
    this.filteredReminders = this.reminders.filter(reminder =>
      reminder.ReminderDate.startsWith(today) && reminder.Status === 'Active'
    );
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
      this.loadData();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadData();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadData();
    }
  }
  // Add this method to your RemindersComponent class

private formatTimeForDatabase(timeString: string): string {
  console.log('🕐 Formatting time:', timeString, 'Type:', typeof timeString);
  
  if (!timeString) {
    console.log('🕐 No time provided, using default 09:00:00');
    return '09:00:00';
  }

  // Handle string input from HTML time input (HH:MM format)
  if (typeof timeString === 'string') {
    // Remove any whitespace
    timeString = timeString.trim();
    
    // Check if it's already in HH:MM:SS format
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      console.log('🕐 Already in HH:MM:SS format:', timeString);
      return timeString;
    }
    
    // Check if it's in HH:MM format (from HTML time input)
    if (/^\d{1,2}:\d{2}$/.test(timeString)) {
      const [hours, minutes] = timeString.split(':');
      const formattedHours = hours.padStart(2, '0');
      const formattedMinutes = minutes.padStart(2, '0');
      const formatted = `${formattedHours}:${formattedMinutes}:00`;
      console.log('🕐 Converted HH:MM to HH:MM:SS:', timeString, '->', formatted);
      return formatted;
    }
    
    // Check if it's just hours (like "9" or "09")
    if (/^\d{1,2}$/.test(timeString)) {
      const formatted = `${timeString.padStart(2, '0')}:00:00`;
      console.log('🕐 Converted hours to HH:MM:SS:', timeString, '->', formatted);
      return formatted;
    }
  }

  // If we can't parse it, try to create a valid time from current time
  try {
    // Try to parse as a date and extract time
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

  // Last resort: return a default valid time
  console.warn('🕐 Could not parse time format, using default 09:00:00. Input was:', timeString);
  return '09:00:00';
}
}