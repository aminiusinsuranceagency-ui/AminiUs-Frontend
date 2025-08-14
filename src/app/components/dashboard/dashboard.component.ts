import { Component, OnInit } from '@angular/core';
import { SessionService } from '../../services/session.service';
import { AppointmentsService, Appointment } from '../../services/appointments.service';
import { ClientsService} from '../../services/clients.service';
import { RemindersService } from '../../services/reminders.service';
import { AnalyticsService, DashboardStatistics } from '../../services/analytics.service';
import { NotesService } from '../../services/notes.service';
import { AgentProfile } from '../../interfaces/Agent';
import { Observable, forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BirthdayReminder, PolicyExpiryReminder, Reminder } from '../../interfaces/Reminder';
import { DailyNote } from '../../interfaces/Note';
import { ClientStatistics } from '../../interfaces/client';
import { NavbarComponent } from "../navbar/navbar.component";
import { Nl2brPipe } from './nl2br.pipe';


interface TodayActivity {
  id: string;
  type: 'appointment' | 'reminder' | 'birthday' | 'policy-expiry';
  title: string;
  subtitle: string;
  time?: string;
  status: string;
  priority?: string;
  icon: string;
  color: string;
  action?: () => void;
}

interface QuickStat {
  label: string;
  value: number;
  icon: string;
  color: string;
  trend?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone:true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent,Nl2brPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: AgentProfile | null = null;
  agentId: string | null = null;
  
  // Loading states
  loading = true;
  activitiesLoading = true;
  statsLoading = true;
  notesLoading = true;

  // Data properties
  todayActivities: TodayActivity[] = [];
  quickStats: QuickStat[] = [];
   todaysNotes: DailyNote[] = [];
  newNotesContent = '';
  
  // Today's specific data
  todaysAppointments: Appointment[] = [];
  todaysReminders: Reminder[] = [];
  birthdayClients: BirthdayReminder[] = [];
  expiringPolicies: PolicyExpiryReminder[] = [];
  
  // Dashboard statistics
  clientStats: ClientStatistics | null = null;
  dashboardStats: DashboardStatistics | null = null;

  // UI state
  showNotesEditor = false;
  selectedActivity: TodayActivity | null = null;
  currentTime = new Date();
  greeting = '';

  constructor(
    private sessionService: SessionService,
    private appointmentsService: AppointmentsService,
    private clientsService: ClientsService,
    private remindersService: RemindersService,
    private analyticsService: AnalyticsService,
    private notesService: NotesService
  ) {
    // Update time every minute
    setInterval(() => {
      this.currentTime = new Date();
      this.updateGreeting();
    }, 60000);
  }

  ngOnInit(): void {
    this.initializeDashboard();
  }

  private initializeDashboard(): void {
    this.currentUser = this.sessionService.getCurrentUser();
    this.agentId = this.sessionService.getAgentId();
    
    if (!this.agentId) {
      console.error('No agent ID found, redirecting to login');
      this.sessionService.logout();
      return;
    }

    this.updateGreeting();
    this.loadDashboardData();
  }

  private updateGreeting(): void {
    const hour = this.currentTime.getHours();
    const firstName = this.currentUser?.FirstName || 'Agent';
    
    if (hour < 12) {
      this.greeting = `Good Morning, ${firstName}`;
    } else if (hour < 17) {
      this.greeting = `Good Afternoon, ${firstName}`;
    } else {
      this.greeting = `Good Evening, ${firstName}`;
    }
  }


private loadDashboardData(): void {
  if (!this.agentId) return;

  this.loading = true;
  const today = new Date().toISOString().split('T')[0];

  forkJoin({
    appointments: this.appointmentsService.getToday(),
    reminders: RemindersService.getToday(this.agentId),
    birthdays: RemindersService.getBirthdays(this.agentId),
    policyExpiries: RemindersService.getPolicyExpiries(this.agentId, 7),
    clientStats: this.clientsService.getStatistics(this.agentId),
    notes: this.notesService.getDailyNotes(this.agentId, today)
  }).subscribe({
    next: (data) => {
      this.todaysAppointments = data.appointments || [];
      this.todaysReminders = data.reminders || [];
      this.birthdayClients = data.birthdays || [];
      this.expiringPolicies = data.policyExpiries || [];
      this.clientStats = data.clientStats;
      this.todaysNotes = data.notes || [];

      this.processActivities();
      this.generateQuickStats();

      this.loading = false;
      this.activitiesLoading = false;
      this.statsLoading = false;
      this.notesLoading = false;
    },
    error: (error) => {
      console.error('Error loading dashboard data:', error);
      this.loading = false;
      this.activitiesLoading = false;
      this.statsLoading = false;
      this.notesLoading = false;
    }
  });
}


  private processActivities(): void {
    const activities: TodayActivity[] = [];

    // Process appointments
    this.todaysAppointments.forEach(appointment => {
      activities.push({
        id: appointment.appointmentId,
        type: 'appointment',
        title: appointment.title,
        subtitle: `with ${appointment.clientName}`,
        time: appointment.startTime,
        status: appointment.status,
        priority: appointment.priority,
        icon: this.getAppointmentIcon(appointment.type),
        color: this.getStatusColor(appointment.status)
      });
    });

    // Process reminders
    this.todaysReminders.forEach(reminder => {
      activities.push({
        id: reminder.ReminderId,
        type: 'reminder',
        title: reminder.Title,
        subtitle: reminder.Description || '',
        time: reminder.ReminderTime || '',
        status: reminder.Status,
        priority: reminder.Priority,
        icon: this.getReminderIcon(reminder.ReminderType),
        color: this.getPriorityColor(reminder.Priority)
      });
    });

    // Process birthdays
    this.birthdayClients.forEach(birthday => {
      activities.push({
        id: birthday.ClientId,
        type: 'birthday',
        title: `Birthday: ${birthday.FirstName} ${birthday.Surname}`,
        subtitle: `Turning ${birthday.Age} today`,
        status: 'pending',
        icon: 'fas fa-birthday-cake',
        color: '#e74c3c'
      });
    });

    // Process expiring policies (within 7 days)
    this.expiringPolicies.forEach(policy => {
      if (policy.DaysUntilExpiry <= 7) {
        activities.push({
          id: policy.PolicyId,
          type: 'policy-expiry',
          title: `Policy Expiring: ${policy.PolicyName}`,
          subtitle: `${policy.FirstName} ${policy.Surname} - ${policy.DaysUntilExpiry} days`,
          status: policy.DaysUntilExpiry <= 3 ? 'urgent' : 'warning',
          icon: 'fas fa-exclamation-triangle',
          color: policy.DaysUntilExpiry <= 3 ? '#e74c3c' : '#f39c12'
        });
      }
    });

    // Sort activities by time and priority
    this.todayActivities = activities.sort((a, b) => {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      if (a.priority && b.priority) {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      }
      return 0;
    });
  }

  private generateQuickStats(): void {
    this.quickStats = [
      {
        label: 'Total Clients',
        value: this.clientStats?.TotalClients || 0,
        icon: 'fas fa-users',
        color: '#3498db'
      },
      {
        label: 'Today\'s Appointments',
        value: this.todaysAppointments.length,
        icon: 'fas fa-calendar-check',
        color: '#2ecc71'
      },
      {
        label: 'Active Reminders',
        value: this.todaysReminders.filter(r => r.Status === 'Active').length,
        icon: 'fas fa-bell',
        color: '#f39c12'
      },
      {
        label: 'Birthdays Today',
        value: this.birthdayClients.length,
        icon: 'fas fa-birthday-cake',
        color: '#e74c3c'
      },
      {
        label: 'Active Policies',
        value: this.clientStats?.ActivePolicies || 0,
        icon: 'fas fa-shield-alt',
        color: '#9b59b6'
      },
      {
        label: 'Expiring Soon',
        value: this.expiringPolicies.filter(p => p.DaysUntilExpiry <= 7).length,
        icon: 'fas fa-exclamation-triangle',
        color: '#e67e22'
      }
    ];
  }

  private getAppointmentIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'Call': 'fas fa-phone',
      'Meeting': 'fas fa-handshake',
      'Site Visit': 'fas fa-map-marker-alt',
      'Policy Review': 'fas fa-file-alt',
      'Claim Processing': 'fas fa-clipboard-check'
    };
    return iconMap[type] || 'fas fa-calendar';
  }

  private getReminderIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'Call': 'fas fa-phone',
      'Visit': 'fas fa-home',
      'Policy Expiry': 'fas fa-exclamation-triangle',
      'Birthday': 'fas fa-birthday-cake',
      'Holiday': 'fas fa-gift',
      'Custom': 'fas fa-bell'
    };
    return iconMap[type] || 'fas fa-bell';
  }

  private getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'Scheduled': '#3498db',
      'Confirmed': '#2ecc71',
      'In Progress': '#f39c12',
      'Completed': '#27ae60',
      'Cancelled': '#e74c3c',
      'Rescheduled': '#f39c12',
      'Active': '#2ecc71',
      'urgent': '#e74c3c',
      'warning': '#f39c12',
      'pending': '#95a5a6'
    };
    return colorMap[status] || '#95a5a6';
  }

  private getPriorityColor(priority: string): string {
    const colorMap: { [key: string]: string } = {
      'High': '#e74c3c',
      'Medium': '#f39c12',
      'Low': '#2ecc71'
    };
    return colorMap[priority] || '#95a5a6';
  }

  // UI Methods
  toggleNotesEditor(): void {
    this.showNotesEditor = !this.showNotesEditor;
    if (this.showNotesEditor && this.todaysNotes.length > 0) {
  this.newNotesContent = this.todaysNotes[0].Notes || '';
}

  }

  saveNotes(): void {
    if (!this.agentId) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    this.notesService.saveDailyNotes(this.agentId, today, this.newNotesContent).subscribe({
      next: (result) => {
        console.log('Notes saved successfully');
        this.loadTodaysNotes();
        this.showNotesEditor = false;
      },
      error: (error) => {
        console.error('Error saving notes:', error);
      }
    });
  }

  private loadTodaysNotes(): void {
    if (!this.agentId) return;
    
    const today = new Date().toISOString().split('T')[0];
    this.notesService.getDailyNotes(this.agentId, today).subscribe({
      next: (notes) => {
        this.todaysNotes = notes;
      },
      error: (error) => {
        console.error('Error loading notes:', error);
      }
    });
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  selectActivity(activity: TodayActivity): void {
    this.selectedActivity = activity;
    // Here you could navigate to detailed view or show modal
  }

  getTimeUntil(time: string): string {
    if (!time) return '';
    
    const now = new Date();
    const activityTime = new Date();
    const [hours, minutes] = time.split(':');
    activityTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const diff = activityTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diff / (1000 * 60));
    
    if (diffMinutes < 0) return 'Past due';
    if (diffMinutes === 0) return 'Now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours}h ${remainingMinutes}m`;
  }

  formatTime(time: string): string {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}