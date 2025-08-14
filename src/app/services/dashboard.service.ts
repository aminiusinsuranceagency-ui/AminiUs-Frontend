// import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { Subject } from 'rxjs';
// import { takeUntil, finalize } from 'rxjs/operators';

// // Services
// import { DashboardService, DashboardData, DashboardStats, DashboardError } from '../../services/dashboard.service';
// import { SessionService } from '../../services/session.service';

// // Interfaces
// import { DailyNote } from '../interfaces/Note';
// import { Reminder, BirthdayReminder, PolicyExpiryReminder } from '../interfaces/Reminder';
// import { Appointment } from '../interfaces/Appointment';
// import { AgentProfile } from '../interfaces/Agent';

// @Component({
//   selector: 'app-dashboard',
//   standalone: true,
//   imports: [CommonModule, FormsModule, ReactiveFormsModule],
//   templateUrl: './dashboard.component.html',
//   styleUrls: ['./dashboard.component.css'],
//   encapsulation: ViewEncapsulation.None
// })
// export class DashboardComponent implements OnInit, OnDestroy {
//   private destroy$ = new Subject<void>();
  
//   // User and session data
//   currentUser: AgentProfile | null = null;
//   agentId: string | null = null;
//   currentDate = new Date();
  
//   // Loading states
//   isLoading = false;
//   isLoadingNotes = false;
  
//   // Dashboard data
//   dashboardData: DashboardData | null = null;
//   todayAppointments: Appointment[] = [];
//   todayReminders: Reminder[] = [];
//   upcomingBirthdays: BirthdayReminder[] = [];
//   expiringPolicies: PolicyExpiryReminder[] = [];
//   dailyNotes: DailyNote[] = [];
  
//   // Dashboard statistics
//   dashboardStats: DashboardStats = {
//     totalAppointments: 0,
//     completedAppointments: 0,
//     pendingReminders: 0,
//     upcomingBirthdays: 0,
//     expiringPolicies: 0,
//     totalNotes: 0
//   };
  
//   // Notes management
//   currentNoteText = '';
//   notesError: string | null = null;
  
//   // Tab management
//   activeTab: 'overview' | 'appointments' | 'reminders' | 'notes' = 'overview';
  
//   // Error handling
//   errorMessages: string[] = [];
//   dashboardErrors: DashboardError[] = [];

//   constructor(
//     private dashboardService: DashboardService,
//     private sessionService: SessionService
//   ) {
//     console.log('🏗️ DashboardComponent constructor initialized');
//   }

//   ngOnInit(): void {
//     console.log('🚀 DashboardComponent ngOnInit started');
//     this.initializeComponent();
//     this.subscribeToDataUpdates();
//   }

//   ngOnDestroy(): void {
//     console.log('🔚 DashboardComponent ngOnDestroy - cleaning up subscriptions');
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   private initializeComponent(): void {
//     console.log('🔄 Initializing dashboard component...');
    
//     try {
//       // Get current user and session info
//       this.getCurrentUser();
      
//       if (this.agentId) {
//         console.log(`✅ Agent ID found: ${this.agentId}, loading dashboard data...`);
//         this.loadDashboardData();
//       } else {
//         console.error('❌ No agent ID found, cannot load dashboard data');
//         this.handleError('Unable to load dashboard: No user session found');
//       }
//     } catch (error) {
//       console.error('❌ Error during dashboard initialization:', error);
//       this.handleError('Failed to initialize dashboard');
//     }
//   }

//   private getCurrentUser(): void {
//     console.log('👤 Getting current user from session...');
    
//     try {
//       this.currentUser = this.sessionService.getCurrentUser();
//       this.agentId = this.sessionService.getAgentId();
      
//       if (this.currentUser && this.agentId) {
//         console.log(`✅ User logged in: ${this.currentUser.FirstName} ${this.currentUser.LastName}`);
//         console.log(`📧 User email: ${this.currentUser.Email}`);
//         console.log(`🆔 Agent ID: ${this.agentId}`);
//         console.log(`🏢 Company: ${this.currentUser.CompanyName || 'Not specified'}`);
//         console.log(`📱 Phone: ${this.currentUser.PhoneNumber || 'Not provided'}`);
//       } else {
//         console.warn('⚠️ Incomplete session data:');
//         console.warn('Current user:', this.currentUser);
//         console.warn('Agent ID:', this.agentId);
//       }
//     } catch (error) {
//       console.error('❌ Error getting current user:', error);
//       this.handleError('Failed to get user information');
//     }
//   }

//   private subscribeToDataUpdates(): void {
//     console.log('🔄 Subscribing to dashboard data updates...');
    
//     // Subscribe to dashboard data updates
//     this.dashboardService.dashboardData$
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (data) => {
//           if (data) {
//             console.log('📊 Dashboard data updated');
//             this.updateDashboardData(data);
//           }
//         },
//         error: (error) => {
//           console.error('❌ Error in dashboard data subscription:', error);
//           this.handleError('Failed to receive dashboard updates');
//         }
//       });

//     // Subscribe to loading state updates
//     this.dashboardService.loading$
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (loading) => {
//           this.isLoading = loading;
//           console.log(`🔄 Loading state changed: ${loading}`);
//         }
//       });

//     // Subscribe to error updates
//     this.dashboardService.errors$
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (errors) => {
//           this.dashboardErrors = errors;
//           this.updateErrorMessages(errors);
//         }
//       });
//   }

//   private loadDashboardData(): void {
//     console.log('📊 Loading dashboard data via service...');
    
//     this.dashboardService.loadDashboardData()
//       .pipe(
//         takeUntil(this.destroy$),
//         finalize(() => {
//           console.log('✅ Dashboard data loading completed');
//         })
//       )
//       .subscribe({
//         next: (data) => {
//           console.log('📈 Dashboard data loaded successfully via service');
//           this.updateDashboardData(data);
//           this.logDataSummary();
//         },
//         error: (error) => {
//           console.error('❌ Error loading dashboard data:', error);
//           this.handleError('Failed to load dashboard data');
//         }
//       });
//   }

//   private updateDashboardData(data: DashboardData): void {
//     console.log('🔄 Updating component data...');
    
//     this.dashboardData = data;
//     this.todayAppointments = data.todayAppointments;
//     this.todayReminders = data.todayReminders;
//     this.upcomingBirthdays = data.upcomingBirthdays;
//     this.expiringPolicies = data.expiringPolicies;
//     this.dailyNotes = data.dailyNotes;
//     this.dashboardStats = data.stats;
    
//     console.log('✅ Component data updated successfully');
//   }

//   private updateErrorMessages(errors: DashboardError[]): void {
//     this.errorMessages = errors.map(error => 
//       `${error.type.charAt(0).toUpperCase() + error.type.slice(1)}: ${error.message}`
//     );
//   }

//   private logDataSummary(): void {
//     console.log('📈 === DASHBOARD DATA SUMMARY ===');
//     console.log(`👤 User: ${this.currentUser?.FirstName} ${this.currentUser?.LastName}`);
//     console.log(`📅 Today's Date: ${this.formatDate(this.currentDate)}`);
//     console.log(`📊 Total Data Points: ${
//       this.todayAppointments.length + 
//       this.todayReminders.length + 
//       this.upcomingBirthdays.length + 
//       this.expiringPolicies.length + 
//       this.dailyNotes.length
//     }`);
//     console.log('Stats:', this.dashboardStats);
//     console.log('==================================');
//   }

//   // Notes Management Methods
//   onAddNote(): void {
//     if (!this.currentNoteText.trim()) {
//       console.warn('⚠️ Cannot add empty note');
//       this.notesError = 'Please enter a note before saving';
//       return;
//     }

//     console.log('📝 Adding new note via service...');
//     this.isLoadingNotes = true;
//     this.notesError = null;

//     this.dashboardService.saveNote(this.currentNoteText.trim())
//       .pipe(
//         takeUntil(this.destroy$),
//         finalize(() => {
//           this.isLoadingNotes = false;
//         })
//       )
//       .subscribe({
//         next: (result) => {
//           console.log('✅ Note saved successfully via service:', result);
//           this.currentNoteText = '';
//           this.notesError = null;
//         },
//         error: (error) => {
//           console.error('❌ Error saving note:', error);
//           this.notesError = 'Failed to save note. Please try again.';
//         }
//       });
//   }

//   onDeleteNote(noteId: string): void {
//     console.log(`🗑️ Deleting note via service: ${noteId}`);
    
//     const noteDate = this.formatDate(new Date());
    
//     this.dashboardService.deleteNote(noteDate)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         nextimport { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { Subject, forkJoin, catchError, of } from 'rxjs';
// import { takeUntil, finalize } from 'rxjs/operators';

// // Services
// import { NotesService } from '../../services/notes.service';
// import { RemindersService } from '../../services/reminders.service';
// import { AppointmentsService } from '../../services/appointments.service';
// import { AnalyticsService } from '../../services/analytics.service';
// import { SessionService } from '../../services/session.service';

// // Interfaces
// import { DailyNote } from '../interfaces/Note';
// import { Reminder, BirthdayReminder, PolicyExpiryReminder } from '../interfaces/Reminder';
// import { Appointment } from '../interfaces/Appointment';
// import { AgentProfile } from '../interfaces/Agent';

// export interface DashboardStats {
//   totalAppointments: number;
//   completedAppointments: number;
//   pendingReminders: number;
//   upcomingBirthdays: number;
//   expiringPolicies: number;
//   totalNotes: number;
// }

// @Component({
//   selector: 'app-dashboard',
//   standalone: true,
//   imports: [CommonModule, FormsModule, ReactiveFormsModule],
//   templateUrl: './dashboard.component.html',
//   styleUrls: ['./dashboard.component.css'],
//   encapsulation: ViewEncapsulation.None
// })
// export class DashboardComponent implements OnInit, OnDestroy {
//   private destroy$ = new Subject<void>();
  
//   // User and session data
//   currentUser: AgentProfile | null = null;
//   agentId: string | null = null;
//   currentDate = new Date();
  
//   // Loading states
//   isLoading = false;
//   isLoadingNotes = false;
//   isLoadingStats = false;
  
//   // Dashboard data
//   todayAppointments: Appointment[] = [];
//   todayReminders: Reminder[] = [];
//   upcomingBirthdays: BirthdayReminder[] = [];
//   expiringPolicies: PolicyExpiryReminder[] = [];
//   dailyNotes: DailyNote[] = [];
  
//   // Dashboard statistics
//   dashboardStats: DashboardStats = {
//     totalAppointments: 0,
//     completedAppointments: 0,
//     pendingReminders: 0,
//     upcomingBirthdays: 0,
//     expiringPolicies: 0,
//     totalNotes: 0
//   };
  
//   // Notes management
//   currentNoteText = '';
//   isEditingNotes = false;
//   notesError: string | null = null;
  
//   // Tab management
//   activeTab: 'overview' | 'appointments' | 'reminders' | 'notes' = 'overview';
  
//   // Error handling
//   errorMessages: string[] = [];

//   constructor(
//     private notesService: NotesService,
//     private appointmentsService: AppointmentsService,
//     private analyticsService: AnalyticsService,
//     private sessionService: SessionService
//   ) {
//     console.log('🏗️ DashboardComponent constructor initialized');
//   }

//   ngOnInit(): void {
//     console.log('🚀 DashboardComponent ngOnInit started');
//     this.initializeComponent();
//   }

//   ngOnDestroy(): void {
//     console.log('🔚 DashboardComponent ngOnDestroy - cleaning up subscriptions');
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   private initializeComponent(): void {
//     console.log('🔄 Initializing dashboard component...');
    
//     try {
//       // Get current user and session info
//       this.getCurrentUser();
      
//       if (this.agentId) {
//         console.log(`✅ Agent ID found: ${this.agentId}, loading dashboard data...`);
//         this.loadDashboardData();
//       } else {
//         console.error('❌ No agent ID found, cannot load dashboard data');
//         this.handleError('Unable to load dashboard: No user session found');
//       }
//     } catch (error) {
//       console.error('❌ Error during dashboard initialization:', error);
//       this.handleError('Failed to initialize dashboard');
//     }
//   }

//   private getCurrentUser(): void {
//     console.log('👤 Getting current user from session...');
    
//     try {
//       this.currentUser = this.sessionService.getCurrentUser();
//       this.agentId = this.sessionService.getAgentId();
      
//       if (this.currentUser && this.agentId) {
//         console.log(`✅ User logged in: ${this.currentUser.FirstName} ${this.currentUser.LastName}`);
//         console.log(`📧 User email: ${this.currentUser.Email}`);
//         console.log(`🆔 Agent ID: ${this.agentId}`);
//         console.log(`🏢 Company: ${this.currentUser.CompanyName || 'Not specified'}`);
//       } else {
//         console.warn('⚠️ Incomplete session data:');
//         console.warn('Current user:', this.currentUser);
//         console.warn('Agent ID:', this.agentId);
//       }
//     } catch (error) {
//       console.error('❌ Error getting current user:', error);
//       this.handleError('Failed to get user information');
//     }
//   }

//   private loadDashboardData(): void {
//     console.log('📊 Loading dashboard data...');
//     this.isLoading = true;
//     this.errorMessages = [];

//     const loadOperations = {
//       appointments: this.loadTodayAppointments(),
//       reminders: this.loadTodayReminders(),
//       birthdays: this.loadUpcomingBirthdays(),
//       policies: this.loadExpiringPolicies(),
//       notes: this.loadDailyNotes(),
//       stats: this.loadDashboardStats()
//     };

//     forkJoin(loadOperations).pipe(
//       takeUntil(this.destroy$),
//       finalize(() => {
//         this.isLoading = false;
//         console.log('✅ Dashboard data loading completed');
//       })
//     ).subscribe({
//       next: (results) => {
//         console.log('📈 All dashboard data loaded successfully');
//         this.logDataSummary();
//       },
//       error: (error) => {
//         console.error('❌ Error loading dashboard data:', error);
//         this.handleError('Failed to load some dashboard data');
//       }
//     });
//   }

//   private loadTodayAppointments() {
//     console.log('📅 Loading today\'s appointments...');
    
//     return this.appointmentsService.getToday(this.agentId!).pipe(
//       takeUntil(this.destroy$),
//       catchError((error) => {
//         console.error('❌ Error loading appointments:', error);
//         this.handleError('Failed to load appointments');
//         return of([]);
//       })
//     ).subscribe({
//       next: (appointments) => {
//         this.todayAppointments = appointments;
//         console.log(`✅ Loaded ${appointments.length} appointments for today`);
        
//         if (appointments.length > 0) {
//           console.log('📋 Today\'s appointments:');
//           appointments.forEach((apt, index) => {
//             console.log(`  ${index + 1}. ${apt.clientName} at ${apt.startTime} - ${apt.status}`);
//           });
//         }
//       }
//     });
//   }

//   private loadTodayReminders() {
//     console.log('🔔 Loading today\'s reminders...');
    
//     return RemindersService.getToday(this.agentId!).then(reminders => {
//       this.todayReminders = reminders;
//       console.log(`✅ Loaded ${reminders.length} reminders for today`);
      
//       if (reminders.length > 0) {
//         console.log('📝 Today\'s reminders:');
//         reminders.forEach((reminder, index) => {
//           console.log(`  ${index + 1}. ${reminder.Title} - ${reminder.ReminderType} (${reminder.Priority})`);
//         });
//       }
//     }).catch(error => {
//       console.error('❌ Error loading reminders:', error);
//       this.handleError('Failed to load reminders');
//       return of([]);
//     });
//   }

//   private loadUpcomingBirthdays() {
//     console.log('🎂 Loading upcoming birthdays...');
    
//     return RemindersService.getBirthdays(this.agentId!).then(birthdays => {
//       this.upcomingBirthdays = birthdays;
//       console.log(`✅ Loaded ${birthdays.length} upcoming birthdays`);
      
//       if (birthdays.length > 0) {
//         console.log('🎉 Upcoming birthdays:');
//         birthdays.forEach((birthday, index) => {
//           console.log(`  ${index + 1}. ${birthday.FirstName} ${birthday.Surname} - Age ${birthday.Age}`);
//         });
//       }
//     }).catch(error => {
//       console.error('❌ Error loading birthdays:', error);
//       this.handleError('Failed to load birthdays');
//       return of([]);
//     });
//   }

//   private loadExpiringPolicies() {
//     console.log('📄 Loading expiring policies...');
    
//     return RemindersService.getPolicyExpiries(this.agentId!, 30).then(policies => {
//       this.expiringPolicies = policies;
//       console.log(`✅ Loaded ${policies.length} expiring policies (next 30 days)`);
      
//       if (policies.length > 0) {
//         console.log('⚠️ Expiring policies:');
//         policies.forEach((policy, index) => {
//           console.log(`  ${index + 1}. ${policy.PolicyName} - ${policy.DaysUntilExpiry} days remaining`);
//         });
//       }
//     }).catch(error => {
//       console.error('❌ Error loading expiring policies:', error);
//       this.handleError('Failed to load expiring policies');
//       return of([]);
//     });
//   }

//   private loadDailyNotes() {
//     console.log('📝 Loading daily notes...');
//     const today = this.formatDate(new Date());
    
//     return this.notesService.getDailyNotes(this.agentId!, today).pipe(
//       takeUntil(this.destroy$),
//       catchError((error) => {
//         console.error('❌ Error loading daily notes:', error);
//         this.handleError('Failed to load notes');
//         return of([]);
//       })
//     ).subscribe({
//       next: (notes) => {
//         this.dailyNotes = notes;
//         console.log(`✅ Loaded ${notes.length} daily notes`);
        
//         if (notes.length > 0) {
//           console.log('📄 Daily notes preview:');
//           notes.forEach((note, index) => {
//             const preview = note.Notes.substring(0, 100);
//             console.log(`  ${index + 1}. ${preview}${note.Notes.length > 100 ? '...' : ''}`);
//           });
//         }
//       }
//     });
//   }

//   private loadDashboardStats() {
//     console.log('📊 Loading dashboard statistics...');
//     this.isLoadingStats = true;
    
//     const filter = {
//       agentId: this.agentId,
//       dateRange: 'today'
//     };

//     return this.analyticsService.getDashboardStatistics(filter).pipe(
//       takeUntil(this.destroy$),
//       catchError((error) => {
//         console.error('❌ Error loading dashboard statistics:', error);
//         this.handleError('Failed to load statistics');
//         return of({
//           totalClients: 0,
//           activePolicies: 0,
//           totalPremiums: 0
//         });
//       }),
//       finalize(() => {
//         this.isLoadingStats = false;
//       })
//     ).subscribe({
//       next: (stats) => {
//         // Update dashboard stats based on loaded data
//         this.dashboardStats = {
//           totalAppointments: this.todayAppointments.length,
//           completedAppointments: this.todayAppointments.filter(apt => apt.status === 'Completed').length,
//           pendingReminders: this.todayReminders.filter(r => r.Status === 'Active').length,
//           upcomingBirthdays: this.upcomingBirthdays.length,
//           expiringPolicies: this.expiringPolicies.length,
//           totalNotes: this.dailyNotes.length
//         };
        
//         console.log('✅ Dashboard statistics updated:');
//         console.log(`  📅 Total appointments: ${this.dashboardStats.totalAppointments}`);
//         console.log(`  ✅ Completed appointments: ${this.dashboardStats.completedAppointments}`);
//         console.log(`  🔔 Pending reminders: ${this.dashboardStats.pendingReminders}`);
//         console.log(`  🎂 Upcoming birthdays: ${this.dashboardStats.upcomingBirthdays}`);
//         console.log(`  ⚠️ Expiring policies: ${this.dashboardStats.expiringPolicies}`);
//         console.log(`  📝 Total notes: ${this.dashboardStats.totalNotes}`);
//       }
//     });
//   }

//   private logDataSummary(): void {
//     console.log('📈 === DASHBOARD DATA SUMMARY ===');
//     console.log(`👤 User: ${this.currentUser?.FirstName} ${this.currentUser?.LastName}`);
//     console.log(`📅 Today's Date: ${this.formatDate(this.currentDate)}`);
//     console.log(`📊 Total Data Points: ${
//       this.todayAppointments.length + 
//       this.todayReminders.length + 
//       this.upcomingBirthdays.length + 
//       this.expiringPolicies.length + 
//       this.dailyNotes.length
//     }`);
//     console.log('==================================');
//   }

//   // Notes Management Methods
//   onAddNote(): void {
//     if (!this.currentNoteText.trim()) {
//       console.warn('⚠️ Cannot add empty note');
//       return;
//     }

//     console.log('📝 Adding new note...');
//     this.isLoadingNotes = true;
//     this.notesError = null;

//     const today = this.formatDate(new Date());

//     this.notesService.saveDailyNotes(this.agentId!, today, this.currentNoteText.trim())
//       .pipe(
//         takeUntil(this.destroy$),
//         finalize(() => {
//           this.isLoadingNotes = false;
//         })
//       )
//       .subscribe({
//         next: (result) => {
//           console.log('✅ Note saved successfully:', result);
//           this.currentNoteText = '';
//           this.loadDailyNotes(); // Reload notes
          
//           // Log activity
//           this.logActivity('Note Added', `Added daily note: ${this.currentNoteText.substring(0, 50)}...`);
//         },
//         error: (error) => {
//           console.error('❌ Error saving note:', error);
//           this.notesError = 'Failed to save note. Please try again.';
//           this.handleError('Failed to save note');
//         }
//       });
//   }

//   onDeleteNote(noteId: string): void {
//     console.log(`🗑️ Deleting note: ${noteId}`);
    
//     const noteDate = this.formatDate(new Date());
    
//     this.notesService.deleteNotes(this.agentId!, noteDate)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (result) => {
//           console.log('✅ Note deleted successfully:', result);
//           this.loadDailyNotes(); // Reload notes
          
//           // Log activity
//           this.logActivity('Note Deleted', 'Deleted daily note');
//         },
//         error: (error) => {
//           console.error('❌ Error deleting note:', error);
//           this.handleError('Failed to delete note');
//         }
//       });
//   }

//   // Appointment Management Methods
//   onCompleteAppointment(appointmentId: string): void {
//     console.log(`✅ Marking appointment as complete: ${appointmentId}`);
    
//     this.appointmentsService.updateStatus(this.agentId!, appointmentId, 'Completed')
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (result) => {
//           console.log('✅ Appointment marked as completed:', result);
          
//           // Update local data
//           const appointment = this.todayAppointments.find(apt => apt.appointmentId === appointmentId);
//           if (appointment) {
//             appointment.status = 'Completed';
//             this.updateDashboardStats();
//           }
          
//           // Log activity
//           this.logActivity('Appointment Completed', `Completed appointment: ${appointment?.clientName}`);
//         },
//         error: (error) => {
//           console.error('❌ Error completing appointment:', error);
//           this.handleError('Failed to complete appointment');
//         }
//       });
//   }

//   // Reminder Management Methods
//   onCompleteReminder(reminderId: string): void {
//     console.log(`✅ Completing reminder: ${reminderId}`);
    
//     RemindersService.complete(this.agentId!, reminderId, 'Completed from dashboard')
//       .then(result => {
//         console.log('✅ Reminder completed successfully:', result);
        
//         // Remove from local data
//         this.todayReminders = this.todayReminders.filter(r => r.ReminderId !== reminderId);
//         this.updateDashboardStats();
        
//         // Log activity
//         this.logActivity('Reminder Completed', 'Completed reminder from dashboard');
//       })
//       .catch(error => {
//         console.error('❌ Error completing reminder:', error);
//         this.handleError('Failed to complete reminder');
//       });
//   }

//   // Tab Management
//   setActiveTab(tab: 'overview' | 'appointments' | 'reminders' | 'notes'): void {
//     console.log(`🔄 Switching to tab: ${tab}`);
//     this.activeTab = tab;
//   }

//   // Utility Methods
//   private updateDashboardStats(): void {
//     this.dashboardStats = {
//       totalAppointments: this.todayAppointments.length,
//       completedAppointments: this.todayAppointments.filter(apt => apt.status === 'Completed').length,
//       pendingReminders: this.todayReminders.filter(r => r.Status === 'Active').length,
//       upcomingBirthdays: this.upcomingBirthdays.length,
//       expiringPolicies: this.expiringPolicies.length,
//       totalNotes: this.dailyNotes.length
//     };
    
//     console.log('📊 Dashboard statistics updated after action');
//   }

//   private logActivity(action: string, description: string): void {
//     const activityLog = {
//       AgentId: this.agentId!,
//       Action: action,
//       Description: description
//     };

//     this.analyticsService.createActivityLog(activityLog)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (result) => {
//           console.log(`📋 Activity logged: ${action}`);
//         },
//         error: (error) => {
//           console.error('❌ Failed to log activity:', error);
//         }
//       });
//   }

//   private handleError(message: string): void {
//     console.error(`❌ Dashboard Error: ${message}`);
//     this.errorMessages.push(message);
    
//     // Remove error after 10 seconds
//     setTimeout(() => {
//       this.errorMessages = this.errorMessages.filter(err => err !== message);
//     }, 10000);
//   }

//   private formatDate(date: Date): string {
//     return date.toISOString().split('T')[0];
//   }

//   // Getter methods for template
//   get getGreeting(): string {
//     const hour = new Date().getHours();
//     if (hour < 12) return 'Good Morning';
//     if (hour < 17) return 'Good Afternoon';
//     return 'Good Evening';
//   }

//   get getUserDisplayName(): string {
//     if (this.currentUser) {
//       return `${this.currentUser.FirstName} ${this.currentUser.LastName}`;
//     }
//     return 'User';
//   }

//   get getTotalPendingTasks(): number {
//     return this.dashboardStats.pendingReminders + 
//            this.todayAppointments.filter(apt => apt.status !== 'Completed').length;
//   }

//   getDaysUntilExpiry(endDate: string): number {
//     const today = new Date();
//     const expiry = new Date(endDate);
//     const timeDiff = expiry.getTime() - today.getTime();
//     return Math.ceil(timeDiff / (1000 * 3600 * 24));
//   }

//   // Method to refresh dashboard data
//   refreshDashboard(): void {
//     console.log('🔄 Refreshing dashboard data...');
//     this.loadDashboardData();
//   }

//   // Method for development/testing
//   debugDashboard(): void {
//     console.log('🐛 === DASHBOARD DEBUG INFO ===');
//     console.log('Current User:', this.currentUser);
//     console.log('Agent ID:', this.agentId);
//     console.log('Loading States:', {
//       isLoading: this.isLoading,
//       isLoadingNotes: this.isLoadingNotes,
//       isLoadingStats: this.isLoadingStats
//     });
//     console.log('Dashboard Stats:', this.dashboardStats);
//     console.log('Today Appointments:', this.todayAppointments);
//     console.log('Today Reminders:', this.todayReminders);
//     console.log('Upcoming Birthdays:', this.upcomingBirthdays);
//     console.log('Expiring Policies:', this.expiringPolicies);
//     console.log('Daily Notes:', this.dailyNotes);
//     console.log('Errors:', this.errorMessages);
//     console.log('===============================');
//   }
// }