import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppointmentsService, Appointment, UpdateAppointmentRequest } from '../../services/appointments.service';
import { SessionService } from '../../services/session.service';
import { RemindersService } from '../../services/reminders.service';
import { CreateReminderRequest } from '../../interfaces/Reminder';
import { Observable, forkJoin, Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { NavbarComponent } from "../navbar/navbar.component";
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ClientDisplay } from '../clients/clients.component';
import { ToastService } from '../../services/toast.service';

interface ClientSearchResult {
  ClientId: string;
  FullName: string;
  PhoneNumber: string;
  Email: string;
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css']
})
export class AppointmentsComponent implements OnInit {

  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];

  // Calendar view properties
  currentDate = new Date();
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  selectedDate: Date | null = null;
  viewMode: 'list' | 'calendar' | 'week' = 'list';
  
  // Filter and search properties
  searchTerm = '';
  statusFilter = 'all';
  typeFilter = 'all';
  priorityFilter = 'all';
  dateRangeFilter = 'all';
  
  // Modal properties
  showAppointmentModal = false;
  showCalendarModal = false;
  isEditMode = false;
  selectedAppointment: Appointment | null = null;
  
  // Form properties
  appointmentForm: Partial<Appointment> = {};
  
  // Client autocomplete properties
  clientSearchResults: ClientSearchResult[] = [];
  showClientDropdown = false;
  clientSearchTerm = '';
  selectedClient: ClientSearchResult | null = null;
  private clientSearchSubject = new Subject<string>();
  
  // Calendar properties
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  calendarDays: any[] = [];
  weekViewDays: any[] = [];
  
  // Statistics
  todayAppointments = 0;
  weekAppointments = 0;
  monthAppointments = 0;
  completedAppointments = 0;

  // Loading states
  loading = false;
  saving = false;
  searchingClients = false;
  creatingReminder = false;

  // User session data
  agentId: string | null = null;

  // Dropdown state
  activeDropdown: string | null = null;
  clientId!: string | null;
  


  constructor(
    private route: ActivatedRoute,
      private toastService: ToastService,

    private appointmentsService: AppointmentsService,
    private sessionService: SessionService,
    private remindersService: RemindersService,
    private http: HttpClient
  ) { 
    // Setup client search with debounce
    this.clientSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        if (searchTerm.length < 2) {
          return of([]);
        }
        return this.searchClients(searchTerm);
      })
    ).subscribe({
      next: (results) => {
        this.clientSearchResults = results;
        this.showClientDropdown = results.length > 0;
        this.searchingClients = false;
      },
      error: (error) => {
        console.error('Client search error:', error);
        this.clientSearchResults = [];
        this.showClientDropdown = false;
        this.searchingClients = false;
      }
    });

    // Close dropdown when clicking outside
     document.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (!target.closest('.dropdown')) {
      this.activeDropdown = null;
    }
  });
  }

  ngOnInit(): void {
    this.initializeComponent();
}

  private initializeComponent(): void {
    // Get agent ID from session
    this.agentId = this.sessionService.getAgentId();
    
    if (!this.agentId) {
      console.error('No agent ID found, redirecting to login');
      this.sessionService.logout();
      return;
    }

    this.loadAppointments();
    this.generateCalendar();
    this.generateWeekView();
  }

  // Dropdown methods
 toggleDropdown(appointmentId: string, event: Event): void {
  event.stopPropagation();
  // Close all other dropdowns and toggle current one
  if (this.activeDropdown === appointmentId) {
    this.activeDropdown = null;
  } else {
    this.activeDropdown = appointmentId;
  }
}

closeDropdown(): void {
  this.activeDropdown = null;
}
toggleReminder(appointment: Appointment): void {
  if (!this.agentId || this.creatingReminder) return;

  if (appointment.reminderSet) {
    // If reminder is already set, show confirmation and remove it
    this.toastService.confirm('Remove reminder for this appointment?', ['Yes', 'No'])
      .subscribe((action) => {
        if (action === 'yes') {
          this.removeReminder(appointment);
        }
      });
  } else {
    // Create new reminder
    this.createReminder(appointment);
  }
}
private removeReminder(appointment: Appointment): void {
  this.creatingReminder = true;
  
  // Update local state immediately for better UX
  const originalState = appointment.reminderSet;
  appointment.reminderSet = false;

  // Here you would call your backend to remove the reminder
  // For now, we'll just simulate the API call
  setTimeout(() => {
    this.toastService.show({
      type: 'success',
      title: 'Reminder Removed',
      message: 'Appointment reminder has been removed.',
      duration: 3000
    });
    this.creatingReminder = false;
  }, 500);

  // If backend call fails, revert the state:
  // appointment.reminderSet = originalState;
}

  // Client search methods
  searchClients(query: string): Observable<ClientSearchResult[]> {
    if (!this.agentId || query.length < 2) {
      return of([]);
    }

    this.searchingClients = true;
    const url = `http://localhost:3000/api/appointments/${this.agentId}/clients/search`;
    
    return this.http.get<ClientSearchResult[]>(url, {
      params: { q: query },
      headers: { 'Content-Type': 'application/json' }
    });
  }

  onClientNameInput(event: any): void {
    const value = event.target.value;
    this.clientSearchTerm = value;
    this.appointmentForm.clientName = value;
    
    if (this.selectedClient && value !== this.selectedClient.FullName) {
      this.selectedClient = null;
      this.appointmentForm.clientId = '';
      this.appointmentForm.clientPhone = '';
    }
    
    if (value.length >= 2) {
      this.clientSearchSubject.next(value);
    } else {
      this.clientSearchResults = [];
      this.showClientDropdown = false;
    }
  }

  selectClient(client: ClientSearchResult): void {
    this.selectedClient = client;
    this.appointmentForm.clientId = client.ClientId;
    this.appointmentForm.clientName = client.FullName;
    this.appointmentForm.clientPhone = client.PhoneNumber;
    this.clientSearchTerm = client.FullName;
    this.showClientDropdown = false;
    this.clientSearchResults = [];
  }

  onClientNameBlur(): void {
    setTimeout(() => {
      this.showClientDropdown = false;
    }, 200);
  }

  onClientNameFocus(): void {
    if (this.clientSearchResults.length > 0) {
      this.showClientDropdown = true;
    }
  }

  // Time formatting method
  formatFriendlyTime(timeString: string): string {
    if (!timeString) return '';
    
    try {
      // Handle different time formats
      let time24: string;
      
      if (timeString.includes(':')) {
        time24 = timeString;
      } else if (timeString.length === 4) {
        // "0900" format
        time24 = `${timeString.substring(0, 2)}:${timeString.substring(2, 4)}`;
      } else {
        return timeString; // Return as-is if format unknown
      }

      const [hours, minutes] = time24.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      
      return date.toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  }
async createReminder(appointment: Appointment): Promise<void> {
  if (!this.agentId) return;

  this.creatingReminder = true;

  // Update local state immediately for better UX
  const originalState = appointment.reminderSet;
  appointment.reminderSet = true;

  try {
    const appointmentDate = new Date(appointment.appointmentDate);
    const reminderDate = new Date(appointmentDate);
    reminderDate.setDate(appointmentDate.getDate() - 1);

    const reminderRequest: CreateReminderRequest = {
      ClientId: appointment.clientId,
      AppointmentId: appointment.appointmentId,
      ReminderType: 'Visit',
      Title: `Visit Reminder: ${appointment.title}`,
      Description: `Reminder for upcoming appointment with ${appointment.clientName}`,
      ReminderDate: reminderDate.toISOString().split('T')[0],
      ReminderTime: '09:00:00',
      ClientName: appointment.clientName,
      Priority: appointment.priority || 'Medium',
      EnableSMS: true,
      EnableWhatsApp: true,
      EnablePushNotification: true,
      AdvanceNotice: '1 day',
      CustomMessage: `Don't forget your appointment on ${appointmentDate.toLocaleDateString()} at ${this.formatFriendlyTime(appointment.startTime || '')}`,
      AutoSend: true,
      Notes: `Auto-created reminder for appointment: ${appointment.title}`
    };

    await this.remindersService.createReminder(this.agentId, reminderRequest).toPromise();

    this.toastService.show({
      type: 'success',
      title: 'Reminder Created',
      message: 'Visit reminder created successfully!',
      duration: 3000
    });

  } catch (error) {
    console.error('Error creating reminder:', error);
    
    // Revert the local state if API call failed
    appointment.reminderSet = originalState;

    this.toastService.show({
      type: 'error',
      title: 'Failed',
      message: 'Failed to create reminder. Please try again.',
      duration: 4000
    });
  } finally {
    this.creatingReminder = false;
  }
}




  private updateAppointmentReminderStatus(appointmentId: string, reminderSet: boolean): void {
    const appointment = this.appointments.find(a => a.appointmentId === appointmentId);
    if (appointment) {
      appointment.reminderSet = reminderSet;
      // You might want to also update this in the backend
    }
  }

  applyFilters(): void {
    this.filteredAppointments = this.appointments.filter(appointment => {
      const matchesSearch = this.searchTerm === '' || 
        appointment.clientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        appointment.title.toLowerCase().includes(this.searchTerm.toLowerCase());
        
      const matchesStatus = this.statusFilter === 'all' || appointment.status === this.statusFilter;
      const matchesType = this.typeFilter === 'all' || appointment.type === this.typeFilter;
      const matchesPriority = this.priorityFilter === 'all' || appointment.priority === this.priorityFilter;
      
      let matchesDateRange = true;
      const today = new Date();
      const appointmentDate = new Date(appointment.appointmentDate);
      
      if (this.dateRangeFilter === 'today') {
        matchesDateRange = this.isSameDay(appointmentDate, today);
      } else if (this.dateRangeFilter === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        matchesDateRange = appointmentDate >= weekStart && appointmentDate <= weekEnd;
      } else if (this.dateRangeFilter === 'month') {
        matchesDateRange = appointmentDate.getMonth() === today.getMonth() && 
                          appointmentDate.getFullYear() === today.getFullYear();
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesDateRange;
    });
  }

  getAppointmentsForSelectedDate(): Appointment[] {
    if (!this.selectedDate) return [];

    return this.appointments.filter(apt =>
      this.isSameDay(new Date(apt.appointmentDate), new Date(this.selectedDate!))
    );
  }

  hasAppointmentsForSelectedDate(): boolean {
    return this.getAppointmentsForSelectedDate().length > 0;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  switchView(mode: 'list' | 'calendar' | 'week'): void {
    this.viewMode = mode;
    if (mode === 'calendar') {
      this.generateCalendar();
    } else if (mode === 'week') {
      this.generateWeekView();
    }
  }

  generateCalendar(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    this.calendarDays = [];
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayAppointments = this.appointments.filter(apt => 
        this.isSameDay(new Date(apt.appointmentDate), date)
      );
      
      this.calendarDays.push({
        date: date,
        isCurrentMonth: date.getMonth() === this.currentMonth,
        isToday: this.isSameDay(date, new Date()),
        isSelected: this.selectedDate && this.isSameDay(date, this.selectedDate),
        appointments: dayAppointments,
        appointmentCount: dayAppointments.length
      });
    }
  }

  generateWeekView(): void {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    this.weekViewDays = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dayAppointments = this.appointments
        .filter(apt => this.isSameDay(new Date(apt.appointmentDate), date))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      this.weekViewDays.push({
        date: date,
        dayName: this.weekDays[i],
        isToday: this.isSameDay(date, new Date()),
        appointments: dayAppointments
      });
    }
  }

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  selectDate(day: any): void {
    this.selectedDate = day.date;
    this.generateCalendar();
  }

  openAppointmentModal(appointment?: Appointment): void {
    console.log("openAppointmentModal fired")
    this.isEditMode = !!appointment;
    this.selectedAppointment = appointment || null;
    
    // Reset client search state
    this.clientSearchResults = [];
    this.showClientDropdown = false;
    this.selectedClient = null;
    this.clientSearchTerm = '';
    
    if (appointment) {
      this.appointmentForm = { ...appointment };
      this.clientSearchTerm = appointment.clientName || '';
      if (appointment.appointmentDate) {
        this.appointmentForm.appointmentDate = new Date(appointment.appointmentDate).toISOString().split('T')[0] as any;
      }
      if (appointment.clientId && appointment.clientName) {
        this.selectedClient = {
          ClientId: appointment.clientId,
          FullName: appointment.clientName,
          PhoneNumber: appointment.clientPhone || '',
          Email: ''
        };
      }
    } else {
      this.appointmentForm = {
        agentId: this.agentId!,
        appointmentDate: this.selectedDate ? 
          new Date(this.selectedDate).toISOString().split('T')[0] as any : 
          new Date().toISOString().split('T')[0] as any,
        startTime: '09:00',
        endTime: '10:00',
        type: 'Meeting',
        status: 'Scheduled',
        priority: 'Medium',
        reminderSet: true
      };
    }
    
    this.showAppointmentModal = true;
  }

  closeAppointmentModal(): void {
    this.showAppointmentModal = false;
    this.appointmentForm = {};
    this.selectedAppointment = null;
    this.clientSearchResults = [];
    this.showClientDropdown = false;
    this.selectedClient = null;
    this.clientSearchTerm = '';
  }

  calculateStatistics(): void {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    this.todayAppointments = this.appointments.filter(apt => 
      this.isSameDay(new Date(apt.appointmentDate), today)
    ).length;
    
    this.weekAppointments = this.appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= startOfWeek && aptDate <= endOfWeek;
    }).length;
    
    this.monthAppointments = this.appointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate.getMonth() === today.getMonth() && 
             aptDate.getFullYear() === today.getFullYear();
    }).length;
    
    this.completedAppointments = this.appointments.filter(apt => 
      apt.status === 'Completed'
    ).length;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  getAppointmentTypeIcon(type: string): string {
    switch (type) {
      case 'Call': return 'fa-phone';
      case 'Meeting': return 'fa-users';
      case 'Site Visit': return 'fa-map-marker-alt';
      case 'Policy Review': return 'fa-file-contract';
      case 'Claim Processing': return 'fa-clipboard-check';
      default: return 'fa-calendar';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Scheduled': return '#f39c12';
      case 'Confirmed': return '#27ae60';
      case 'In Progress': return '#3498db';
      case 'Completed': return '#2ecc71';
      case 'Cancelled': return '#dc2626';
      case 'Rescheduled': return '#9b59b6';
      default: return '#95a5a6';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'High': return '#dc2626';
      case 'Medium': return '#f39c12';
      case 'Low': return '#27ae60';
      default: return '#95a5a6';
    }
  }

  /************ Data loading ************/
  loadAppointments(): void {
    if (!this.agentId) return;

    this.loading = true;
    console.log('loadAppointments: requesting appointments for agent', this.agentId);

    this.appointmentsService.getAllAppointments().subscribe({
      next: (response: any) => {
        console.log('loadAppointments: raw response', response);

        let appointmentsData: Appointment[] = [];
        if (Array.isArray(response)) {
          appointmentsData = response;
        } else if (response && Array.isArray(response.data)) {
          appointmentsData = response.data;
        } else if (response && Array.isArray(response.appointments)) {
          appointmentsData = response.appointments;
        } else if (response && typeof response === 'object' && Object.keys(response).length > 0) {
          appointmentsData = [response];
        }

        // Normalize and add formatted time
        this.appointments = appointmentsData.map(a => ({
          ...a,
          formattedTime: this.formatAppointmentTime(a)
        }));

        console.log('loadAppointments: normalized appointments count =', this.appointments.length);

        this.applyFilters();
        this.calculateStatistics();
        this.generateCalendar();
        this.generateWeekView();

        this.loading = false;
      },
      error: (error: any) => {
        console.error('loadAppointments: error', error);
        alert('Failed to load appointments: ' + (error?.message || error));
        this.appointments = [];
        this.loading = false;
      }
    });
  }

  /************ Create / Update / Delete ************/

  saveAppointment(): void {
  if (!this.agentId || this.saving) return;

  if (!this.appointmentForm.title || !this.appointmentForm.clientName ||
    !this.appointmentForm.appointmentDate || !this.appointmentForm.startTime ||
    !this.appointmentForm.endTime) {
    this.toastService.show({
      type: 'warning',
      message: 'Please fill in all required fields',
      duration: 4000
    });
    return;
  }

  if (!this.appointmentForm.clientId) {
    this.toastService.show({
      type: 'error',
      message: 'Please select a valid client from the dropdown',
      duration: 4000
    });
    return;
  }

  this.saving = true;
  console.log('saveAppointment: formData=', this.appointmentForm);

  const payload = this.appointmentsService.createAppointmentPayload(this.appointmentForm);

  if (this.isEditMode && this.selectedAppointment) {
    const appointmentId = this.selectedAppointment.appointmentId;
    const updatePayload: UpdateAppointmentRequest =
      this.appointmentsService.createUpdateAppointmentPayload(this.appointmentForm);

    console.log('saveAppointment: updating appointment', appointmentId, updatePayload);

    this.appointmentsService.update(appointmentId, updatePayload).subscribe({
      next: (res) => {
        console.log('saveAppointment: update success', res);
        this.toastService.show({
          type: 'success',
          message: 'Appointment updated successfully',
          duration: 3000
        });
        this.saving = false;
        this.closeAppointmentModal();
        this.loadAppointments();
      },
      error: (err) => {
        console.error('saveAppointment: update error', err);
        this.toastService.show({
          type: 'error',
          message: 'Failed to update appointment: ' + (err?.message || err),
          duration: 5000
        });
        this.saving = false;
      }
    });

  } else {
    console.log('saveAppointment: creating appointment payload=', payload);

    this.appointmentsService.create(payload).subscribe({
      next: (res) => {
        console.log('saveAppointment: create success', res);
        this.toastService.show({
          type: 'success',
          message: 'Appointment created successfully',
          duration: 3000
        });
        this.saving = false;
        this.closeAppointmentModal();
        this.loadAppointments();
      },
      error: (err) => {
        console.error('saveAppointment: create error', err);
        this.toastService.show({
          type: 'error',
          message: 'Failed to create appointment: ' + (err?.message || err),
          duration: 5000
        });
        this.saving = false;
      }
    });
  }
}


deleteAppointment(appointmentId: string): void {
  if (!this.agentId) return;

  this.toastService.confirm('Are you sure you want to delete this appointment?', ['Yes', 'No'])
    .subscribe((action) => {
      if (action === 'yes') {
        this.closeDropdown();
        console.log('deleteAppointment: deleting', appointmentId);

        this.appointmentsService.delete(appointmentId).subscribe({
          next: (res) => {
            console.log('deleteAppointment: success', res);
            this.toastService.show({
              type: 'success',
              message: 'Appointment deleted successfully',
              duration: 3000
            });
            this.loadAppointments();
          },
          error: (err) => {
            console.error('deleteAppointment: error', err);
            this.toastService.show({
              type: 'error',
              message: 'Failed to delete appointment: ' + (err?.message || err),
              duration: 5000
            });
          }
        });
      }
    });
}

updateAppointmentStatus(appointmentId: string, status: Appointment['status']): void {
  if (!this.agentId) return;

  this.closeDropdown();
  console.log('updateAppointmentStatus: appointmentId=', appointmentId, 'status=', status);

  this.appointmentsService.updateStatus(appointmentId, status).subscribe({
    next: (res) => {
      console.log('updateAppointmentStatus: success', res);
      this.toastService.show({
        type: 'success',
        message: `Appointment status updated to "${status}"`,
        duration: 3000
      });
      this.loadAppointments();
    },
    error: (err) => {
      console.error('updateAppointmentStatus: error', err);
      this.toastService.show({
        type: 'error',
        message: 'Failed to update appointment status: ' + (err?.message || err),
        duration: 5000
      });
    }
  });
}


  private parseTimeString(t?: string): { h: number; m: number } | null {
    if (!t) return null;
    const s = String(t).trim();

    if (/^\d{3,4}$/.test(s)) {
      const v = parseInt(s, 10);
      const h = Math.floor(v / 100);
      const m = v % 100;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { h, m };
      return null;
    }

    const match = s.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)?$/i);
    if (!match) return null;

    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3]?.toUpperCase();

    if (isNaN(hour) || isNaN(minute)) return null;

    if (ampm) {
      if (hour === 12) hour = 0;
      if (ampm === 'PM') hour += 12;
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    return { h: hour, m: minute };
  }
private formatAppointmentTime(appointment: Appointment): string {
  if (!appointment.startTime && !appointment.endTime) return '';

  const formatTimeString = (timeStr: string): string => {
    if (!timeStr) return '';
    
    try {
      // Handle different time formats that might come from the database
      let cleanTime = timeStr.toString().trim();
      
      // If it's already in HH:MM format, use it directly
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(cleanTime)) {
        const [hours, minutes] = cleanTime.split(':');
        const hour24 = parseInt(hours, 10);
        const min = parseInt(minutes, 10);
        
        // Create a date object just for formatting
        const tempDate = new Date();
        tempDate.setHours(hour24, min, 0, 0);
        
        // Format to 12-hour time
        return tempDate.toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
      
      // If it's a 4-digit number like "0900"
      if (/^\d{4}$/.test(cleanTime)) {
        const hours = parseInt(cleanTime.substring(0, 2), 10);
        const minutes = parseInt(cleanTime.substring(2, 4), 10);
        
        const tempDate = new Date();
        tempDate.setHours(hours, minutes, 0, 0);
        
        return tempDate.toLocaleTimeString([], { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
      
      // If it's a full datetime string, extract time portion
      if (timeStr.includes('T') || timeStr.includes(' ')) {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString([], { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
        }
      }
      
      // Fallback: return original string if we can't parse it
      return timeStr;
      
    } catch (error) {
      console.warn('Error formatting time:', timeStr, error);
      return timeStr;
    }
  };

  const startStr = appointment.startTime ? formatTimeString(appointment.startTime) : '';
  const endStr = appointment.endTime ? formatTimeString(appointment.endTime) : '';

  return [startStr, endStr].filter(Boolean).join(' – ');
}}

