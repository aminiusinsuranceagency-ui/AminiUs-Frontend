import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin, interval, takeUntil, catchError, of } from 'rxjs';

// Import services
import { SessionService } from '../../services/session.service';
import { ClientsService } from '../../services/clients.service';
import { AppointmentsService } from '../../services/appointments.service';
import { PolicyService } from '../../services/policies.service';
import { NotesService } from '../../services/notes.service';

// Import interfaces
import { AgentProfile } from '../../interfaces/Agent';
import { Client, ClientStatistics, Birthday } from '../../interfaces/client';
import { Appointment, AppointmentStatistics } from '../../services/appointments.service';
import { ClientPolicy, AgentDashboardSummary } from '../../interfaces/policy';
import { DailyNote } from '../../interfaces/Note';

// Import components
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Nl2brPipe } from "./nl2br.pipe";

interface DashboardData {
  agent: AgentProfile | null;
  clientStats: ClientStatistics | null;
  appointmentStats: AppointmentStatistics | null;
  policyStats: AgentDashboardSummary | null;
  todayAppointments: Appointment[];
  expiringPolicies: ClientPolicy[];
  todayBirthdays: Birthday[];
  recentClients: Client[];
  todayNotes: DailyNote[];
  quickActions: QuickAction[];
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  count?: number;
}

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  route?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Nl2brPipe
],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Loading states
  loading = true;
  loadingStates = {
    clients: true,
    appointments: true,
    policies: true,
    notes: true
  };

  // Dashboard data
  dashboardData: DashboardData = {
    agent: null,
    clientStats: null,
    appointmentStats: null,
    policyStats: null,
    todayAppointments: [],
    expiringPolicies: [],
    todayBirthdays: [],
    recentClients: [],
    todayNotes: [],
    quickActions: []
  };

  // UI state
  currentTime = new Date();
  greeting = '';
  todayNotesText = '';
  showNotesEditor = false;

  // Stats cards configuration
  statCards: StatCard[] = [];

  constructor(
    private sessionService: SessionService,
    private clientsService: ClientsService,
    private appointmentsService: AppointmentsService,
    private policyService: PolicyService,
    private notesService: NotesService,
    private router: Router
  ) {
    this.initializeQuickActions();
  }

  ngOnInit(): void {
    this.dashboardData.agent = this.sessionService.getCurrentUser();
    this.setGreeting();
    this.loadDashboardData();
    this.startRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting = 'Good Morning';
    } else if (hour < 17) {
      this.greeting = 'Good Afternoon';
    } else {
      this.greeting = 'Good Evening';
    }
  }

  private initializeQuickActions(): void {
  this.dashboardData.quickActions = [
    {
      title: 'Add Client',
      description: 'Register a new client or prospect',
      icon: 'fas fa-user-plus',
      route: '/client',
      color: 'blue-bg'
    },
    {
      title: 'Schedule Appointment',
      description: 'Book a meeting with a client',
      icon: 'fas fa-calendar-plus',
      route: '/appointment',
      color: 'green-bg'
    },
    {
      title: 'Create Policy',
      description: 'Add a new insurance policy',
      icon: 'fas fa-shield-alt',
      route: '/policies',
      color: 'purple-bg'
    },
    {
      title: 'Reminders',
      description: 'Get Up To Date with Reminders',
      icon: 'fas fa-chart-bar',
      route: '/reminders',
      color: 'orange-bg'
    }
  ];
}



  private loadDashboardData(): void {
    const agentId = this.sessionService.getAgentId();
    if (!agentId) {
      this.router.navigate(['/login']);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Load all data in parallel
    forkJoin({
      clientStats: this.clientsService.getStatistics(agentId).pipe(
        catchError(err => {
          console.error('Error loading client stats:', err);
          return of(null);
        })
      ),
      appointmentStats: this.appointmentsService.getStatistics().pipe(
        catchError(err => {
          console.error('Error loading appointment stats:', err);
          return of(null);
        })
      ),
      policyStats: this.policyService.getMyDashboard().pipe(
        catchError(err => {
          console.error('Error loading policy stats:', err);
          return of(null);
        })
      ),
      todayAppointments: this.appointmentsService.getToday().pipe(
        catchError(err => {
          console.error('Error loading today appointments:', err);
          return of([]);
        })
      ),
      expiringPolicies: this.policyService.getMyExpiringPolicies(30).pipe(
        catchError(err => {
          console.error('Error loading expiring policies:', err);
          return of([]);
        })
      ),
      todayBirthdays: this.clientsService.getBirthdays(agentId).pipe(
        catchError(err => {
          console.error('Error loading birthdays:', err);
          return of([]);
        })
      ),
      recentClients: this.clientsService.getAll(agentId, { 
        PageSize: 10,
        PageNumber: 1 
      }).pipe(
        catchError(err => {
          console.error('Error loading recent clients:', err);
          return of([]);
        })
      ),
      todayNotes: this.notesService.getDailyNotes(agentId, today).pipe(
        catchError(err => {
          console.error('Error loading today notes:', err);
          return of([]);
        })
      )
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.dashboardData = { ...this.dashboardData, ...data };
        this.todayNotesText = data.todayNotes?.[0]?.Notes || '';
        this.updateStatCards();
        this.updateLoadingStates();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loading = false;
      }
    });
  }

  private updateStatCards(): void {
    const { clientStats, appointmentStats, policyStats } = this.dashboardData;
    
    this.statCards = [
      {
        title: 'Total Clients',
        value: clientStats?.TotalClients || 0,
        icon: 'fas fa-users',
        color: 'bg-blue-500',
        route: '/clients',
        trend: {
          value: clientStats?.NewThisWeek || 0,
          isPositive: true
        }
      },
      {
        title: 'Active Policies',
        value: policyStats?.activePolicies || 0,
        icon: 'fas fa-shield-alt',
        color: 'bg-green-500',
        route: '/policies'
      },
      {
        title: 'Today\'s Appointments',
        value: appointmentStats?.todayCount || 0,
        icon: 'fas fa-calendar-day',
        color: 'bg-purple-500',
        route: '/appointments'
      },
      {
        title: 'Maturing Soon',
        value: policyStats?.expiringIn30Days || 0,
        icon: 'fas fa-exclamation-triangle',
        color: 'bg-red-500',
        route: '/policies/expiring'
      },
      {
        title: 'Total Prospects',
        value: clientStats?.TotalProspects || 0,
        icon: 'fas fa-user-clock',
        color: 'bg-orange-500',
        route: '/clients?filter=prospects'
      },
      {
        title: 'This Week',
        value: appointmentStats?.weekCount || 0,
        icon: 'fas fa-calendar-week',
        color: 'bg-indigo-500',
        route: '/appointments/week'
      }
    ];
  }

  private updateLoadingStates(): void {
    this.loadingStates = {
      clients: false,
      appointments: false,
      policies: false,
      notes: false
    };
  }

  private startRealTimeUpdates(): void {
    // Update time every minute
    interval(60000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentTime = new Date();
    });

    // Refresh data every 5 minutes
    interval(300000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadDashboardData();
    });
  }

  // Event handlers
  onQuickAction(action: QuickAction): void {
    this.router.navigate([action.route]);
  }

  onStatCardClick(card: StatCard): void {
    if (card.route) {
      this.router.navigate([card.route]);
    }
  }

  onAppointmentClick(appointment: Appointment): void {
    this.router.navigate(['/appointments', appointment.appointmentId]);
  }

  onPolicyClick(policy: ClientPolicy): void {
    this.router.navigate(['/policies', policy.policyId]);
  }

  onClientClick(client: Client): void {
    this.router.navigate(['/clients', client.ClientId]);
  }

  onEditNotes(): void {
    this.showNotesEditor = true;
  }

  onSaveNotes(): void {
    const agentId = this.sessionService.getAgentId();
    if (!agentId) return;

    const today = new Date().toISOString().split('T')[0];
    
    this.notesService.saveDailyNotes(agentId, today, this.todayNotesText)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showNotesEditor = false;
          console.log('Notes saved successfully');
        },
        error: (error) => {
          console.error('Error saving notes:', error);
        }
      });
  }

  onCancelNotes(): void {
    this.showNotesEditor = false;
    // Reset to original notes
    this.todayNotesText = this.dashboardData.todayNotes?.[0]?.Notes || '';
  }

  // Utility methods
  getAppointmentStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'Scheduled': 'text-blue-600 bg-blue-100',
      'Confirmed': 'text-green-600 bg-green-100',
      'In Progress': 'text-yellow-600 bg-yellow-100',
      'Completed': 'text-gray-600 bg-gray-100',
      'Cancelled': 'text-red-600 bg-red-100',
      'Rescheduled': 'text-purple-600 bg-purple-100'
    };
    return statusColors[status] || 'text-gray-600 bg-gray-100';
  }

  getPolicyStatusColor(policy: ClientPolicy): string {
    if (this.policyService.isPolicyExpired(policy)) {
      return 'text-red-600 bg-red-100';
    } else if (this.policyService.isPolicyExpiringSoon(policy)) {
      return 'text-yellow-600 bg-yellow-100';
    } else if (policy.status === 'Active') {
      return 'text-green-600 bg-green-100';
    } else {
      return 'text-gray-600 bg-gray-100';
    }
  }

formatTime(timeString: string | null | undefined, use24h: boolean = false): string {
  if (!timeString) return '';

  try {
    // If it's an ISO date string, extract just the time portion
    if (timeString.includes('T')) {
      const isoDate = new Date(timeString);
      const hours = isoDate.getUTCHours();
      const minutes = isoDate.getUTCMinutes();

      if (!use24h) {
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12;
        return `${displayHour}:${minutes.toString().padStart(2, '0')} ${suffix}`;
      }

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Otherwise assume plain "HH:mm" or "HH:mm:ss"
    const parts = timeString.split(':').map(p => p.trim());
    if (parts.length < 2) return timeString;

    let hours = Number(parts[0]);
    let minutes = Number(parts[1]);

    if (!use24h) {
      const suffix = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes.toString().padStart(2, '0')} ${suffix}`;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch {
    return timeString;
  }
}


formatDate(dateInput: string | Date): string {
  if (!dateInput) return '';
  
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return String(dateInput);
  }
}

  getDaysUntilExpiry(policy: ClientPolicy): number {
    return this.policyService.getDaysUntilExpiry(policy) || 0;
  }

  refreshDashboard(): void {
    this.loading = true;
    this.loadDashboardData();
  }
}