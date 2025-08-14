import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavbarComponent } from "../navbar/navbar.component";
import { RemindersService } from '../../services/reminders.service';
import { SessionService } from '../../services/session.service';
import { ClientsService } from '../../services/clients.service';
import { Subscription } from 'rxjs';
import {
  Reminder,
  CreateReminderRequest,
  UpdateReminderRequest,
  BirthdayReminder,
  PolicyExpiryReminder,
  ReminderFilters
} from '../../interfaces/Reminder';

export interface AutomatedMessage {
  messageId: string;
  type: 'Birthday' | 'Holiday' | 'Policy Expiry' | 'Appointment' | 'Custom';
  title: string;
  template: string;
  recipients: string[];
  scheduledDate: Date;
  status: 'Scheduled' | 'Sent' | 'Failed';
  deliveryMethod: 'SMS' | 'WhatsApp' | 'Both';
}

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './reminders.component.html',
  styleUrl: './reminders.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class RemindersComponent implements OnInit, OnDestroy {
  activeTab: string = 'upcoming';
  reminderForm: FormGroup;
  messageForm: FormGroup;
  showReminderModal: boolean = false;
  showMessageModal: boolean = false;
  selectedReminder: Reminder | null = null;
  templateHelp = 'Use placeholders like {name}, {date}, {policy} for dynamic content';
  
  // Loading and error states
  loading = false;
  error: string | null = null;
  
  // Data arrays
  reminders: Reminder[] = [];
  automatedMessages: AutomatedMessage[] = [];
  clients: any[] = []; // For client selection
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  // Current agent ID
  agentId: string | null = null;

  reminderTypes = [
    { value: 'Call', label: 'Call Reminder', icon: 'phone' },
    { value: 'Visit', label: 'Visit Reminder', icon: 'location' },
    { value: 'Policy Expiry', label: 'Policy Expiry', icon: 'document' },
    { value: 'Birthday', label: 'Birthday', icon: 'gift' },
    { value: 'Holiday', label: 'Holiday', icon: 'calendar' },
    { value: 'Custom', label: 'Custom', icon: 'bell' }
  ];

  advanceNoticeOptions = [
    { value: '15 minutes', label: '15 minutes' },
    { value: '30 minutes', label: '30 minutes' },
    { value: '1 hour', label: '1 hour' },
    { value: '1 day', label: '1 day' },
    { value: '1 week', label: '1 week' },
    { value: '2 weeks', label: '2 weeks' },
    { value: '1 month', label: '1 month' },
    { value: '2 months', label: '2 months' },
    { value: '3 months', label: '3 months' }
  ];

  constructor(
    private fb: FormBuilder,
    private remindersService: RemindersService,
    private sessionService: SessionService,
    private clientsService: ClientsService
  ) {
    this.reminderForm = this.fb.group({
      ReminderType: ['', Validators.required],
      Title: ['', Validators.required],
      Description: [''],
      ReminderDate: ['', Validators.required],
      ReminderTime: [''],
      ClientId: [''],
      ClientName: [''],
      Priority: ['Medium', Validators.required],
      EnableSMS: [false],
      EnableWhatsApp: [false],
      EnablePushNotification: [true],
      AdvanceNotice: ['1 day'],
      CustomMessage: [''],
      AutoSend: [false],
      Notes: ['']
    });

    this.messageForm = this.fb.group({
      type: ['', Validators.required],
      title: ['', Validators.required],
      template: ['', Validators.required],
      scheduledDate: ['', Validators.required],
      deliveryMethod: ['SMS', Validators.required],
      recipients: ['']
    });
  }

  ngOnInit(): void {
    this.agentId = this.sessionService.getAgentId();
    if (!this.agentId) {
      this.error = 'Agent ID not found. Please login again.';
      return;
    }
    
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

   async loadInitialData(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      await Promise.all([
        this.loadReminders(),
        this.loadClients()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.error = 'Failed to load data. Please refresh the page.';
    } finally {
      this.loading = false;
    }
  }

  private async loadReminders(): Promise<void> {
    if (!this.agentId) return;
    
    try {
      const response = await RemindersService.getAll(this.agentId);
      this.reminders = response.reminders || [];
    } catch (error) {
      console.error('Error loading reminders:', error);
      throw error;
    }
  }

  private loadClients(): void {
    if (!this.agentId) return;
    
    const sub = this.clientsService.getAll(this.agentId).subscribe({
      next: (clients) => {
        this.clients = clients;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
      }
    });
    
    this.subscriptions.push(sub);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  openReminderModal(reminder?: Reminder): void {
    this.selectedReminder = reminder || null;
    console.log('Opening reminder modal');

    if (reminder) {
      // Convert backend format to form format
      this.reminderForm.patchValue({
        ReminderType: reminder.ReminderType,
        Title: reminder.Title,
        Description: reminder.Description,
        ReminderDate: this.formatDateForInput(reminder.ReminderDate),
        ReminderTime: reminder.ReminderTime,
        ClientId: reminder.ClientId,
        ClientName: reminder.ClientName || reminder.FullClientName,
        Priority: reminder.Priority,
        EnableSMS: reminder.EnableSMS,
        EnableWhatsApp: reminder.EnableWhatsApp,
        EnablePushNotification: reminder.EnablePushNotification,
        AdvanceNotice: reminder.AdvanceNotice,
        CustomMessage: reminder.CustomMessage,
        AutoSend: reminder.AutoSend,
        Notes: reminder.Notes
      });
    } else {
      this.reminderForm.reset();
      this.reminderForm.patchValue({
        Priority: 'Medium',
        EnablePushNotification: true,
        AdvanceNotice: '1 day'
      });
    }
    this.showReminderModal = true;
  }

  closeReminderModal(): void {
    this.showReminderModal = false;
    this.selectedReminder = null;
  }

  async saveReminder(): Promise<void> {
    if (!this.reminderForm.valid || !this.agentId) return;

    this.loading = true;
    this.error = null;

    try {
      const formValue = this.reminderForm.value;
      
      if (this.selectedReminder) {
        // Update existing reminder
        const updateData: UpdateReminderRequest = {
          Title: formValue.Title,
          Description: formValue.Description,
          ReminderDate: this.formatDateForBackend(formValue.ReminderDate),
          ReminderTime: formValue.ReminderTime,
          Priority: formValue.Priority,
          EnableSMS: formValue.EnableSMS,
          EnableWhatsApp: formValue.EnableWhatsApp,
          EnablePushNotification: formValue.EnablePushNotification,
          AdvanceNotice: formValue.AdvanceNotice,
          CustomMessage: formValue.CustomMessage,
          AutoSend: formValue.AutoSend,
          Notes: formValue.Notes
        };

        await RemindersService.update(this.agentId, this.selectedReminder.ReminderId, updateData);
      } else {
        // Create new reminder
        const createData: CreateReminderRequest = {
          ClientId: formValue.ClientId || undefined,
          ReminderType: formValue.ReminderType,
          Title: formValue.Title,
          Description: formValue.Description,
          ReminderDate: this.formatDateForBackend(formValue.ReminderDate),
          ReminderTime: formValue.ReminderTime,
          ClientName: formValue.ClientName,
          Priority: formValue.Priority,
          EnableSMS: formValue.EnableSMS,
          EnableWhatsApp: formValue.EnableWhatsApp,
          EnablePushNotification: formValue.EnablePushNotification,
          AdvanceNotice: formValue.AdvanceNotice,
          CustomMessage: formValue.CustomMessage,
          AutoSend: formValue.AutoSend,
          Notes: formValue.Notes
        };

        await RemindersService.create(this.agentId, createData);
      }

      await this.loadReminders();
      this.closeReminderModal();
    } catch (error) {
      console.error('Error saving reminder:', error);
      this.error = 'Failed to save reminder. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  openMessageModal(): void {
    this.messageForm.reset();
    console.log('Opening message modal');
    this.messageForm.patchValue({
      deliveryMethod: 'SMS'
    });
    this.showMessageModal = true;
  }

  closeMessageModal(): void {
    this.showMessageModal = false;
  }

  saveMessage(): void {
    if (this.messageForm.valid) {
      const formValue = this.messageForm.value;
      const message: AutomatedMessage = {
        messageId: this.generateId(),
        type: formValue.type,
        title: formValue.title,
        template: formValue.template,
        scheduledDate: new Date(formValue.scheduledDate),
        deliveryMethod: formValue.deliveryMethod,
        recipients: formValue.recipients.split(',').map((r: string) => r.trim()),
        status: 'Scheduled'
      };

      this.automatedMessages.push(message);
      this.closeMessageModal();
    }
  }

  async deleteReminder(reminderId: string): Promise<void> {
    if (!this.agentId) return;

    if (!confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    this.loading = true;
    try {
      await RemindersService.delete(this.agentId, reminderId);
      await this.loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      this.error = 'Failed to delete reminder. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async completeReminder(reminderId: string): Promise<void> {
    if (!this.agentId) return;

    this.loading = true;
    try {
      await RemindersService.complete(this.agentId, reminderId);
      await this.loadReminders();
    } catch (error) {
      console.error('Error completing reminder:', error);
      this.error = 'Failed to complete reminder. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  deleteMessage(messageId: string): void {
    this.automatedMessages = this.automatedMessages.filter(m => m.messageId !== messageId);
  }

  getUpcomingReminders(): Reminder[] {
    const now = new Date();
    return this.reminders.filter(r => 
      r.Status === 'Active' && new Date(r.ReminderDate) >= now
    );
  }

  getCompletedReminders(): Reminder[] {
    return this.reminders.filter(r => r.Status === 'Completed');
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'High': return 'alert-circle';
      case 'Medium': return 'clock';
      case 'Low': return 'info';
      default: return 'clock';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return 'priority-medium';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'Call': return 'phone';
      case 'Visit': return 'map-pin';
      case 'Policy Expiry': return 'file-text';
      case 'Birthday': return 'gift';
      case 'Holiday': return 'calendar';
      default: return 'bell';
    }
  }

  onClientSelected(event: any): void {
    const clientId = event.target.value;
    const selectedClient = this.clients.find(c => c.ClientId === clientId);
    
    if (selectedClient) {
      this.reminderForm.patchValue({
        ClientName: `${selectedClient.FirstName} ${selectedClient.Surname || selectedClient.LastName}`
      });
    }
  }

  // Utility methods for date formatting
  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  }

  private formatDateForBackend(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch (error) {
      console.error('Error formatting date for backend:', error);
      return '';
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Method to refresh reminders
  async refreshReminders(): Promise<void> {
    await this.loadReminders();
  }

  // Method to get today's reminders
  async getTodaysReminders(): Promise<void> {
    if (!this.agentId) return;
    
    try {
      const todaysReminders = await RemindersService.getToday(this.agentId);
      console.log("Today's reminders:", todaysReminders);
    } catch (error) {
      console.error('Error getting today\'s reminders:', error);
    }
  }

  // Method to get birthdays
  async getBirthdays(): Promise<void> {
    if (!this.agentId) return;
    
    try {
      const birthdays = await RemindersService.getBirthdays(this.agentId);
      console.log('Birthdays:', birthdays);
    } catch (error) {
      console.error('Error getting birthdays:', error);
    }
  }

  // Method to get policy expiries
  async getPolicyExpiries(): Promise<void> {
    if (!this.agentId) return;
    
    try {
      const policyExpiries = await RemindersService.getPolicyExpiries(this.agentId);
      console.log('Policy expiries:', policyExpiries);
    } catch (error) {
      console.error('Error getting policy expiries:', error);
    }
  }
}