import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavbarComponent } from "../navbar/navbar.component";
import { ClientsService } from '../../services/clients.service';
import { SessionService } from '../../services/session.service';
import { ActivatedRoute, Router } from '@angular/router';

import { Subject, takeUntil, catchError, of, finalize } from 'rxjs';
import {
  Client,
  ClientWithDetails,
  CreateClientRequest,
  UpdateClientRequest,
  ClientSearchFilters,
  ClientStatistics,
  Birthday
} from '../../interfaces/client';
import { ToastService } from '../../services/toast.service';

// Keep the interfaces for backward compatibility with the template
export interface Policy {
  policyId: string;
  name: string;
  type: string;
  companyName: string;
  status: 'Active' | 'Inactive' | 'Expired' | 'Lapsed';
  startDate: Date;
  endDate: Date;
  notes?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  title: string;
  date: Date;
  time: string;
  type: string;
}

// Updated interface for template compatibility
export interface ClientDisplay {
  id: string;
  firstName: string;
  surname: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  address: string;
  nationalId: string;
  dateOfBirth: Date;
  isClient: boolean;
  insuranceType: string;
  notes?: string;
  policy?: Policy;
  appointments?: Appointment[];
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.css',
  encapsulation: ViewEncapsulation.None
})
export class ClientsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  clients: ClientDisplay[] = [];
  filteredClients: ClientDisplay[] = [];
  selectedClient: ClientDisplay | null = null;
  
  showAddModal = false;
  showEditModal = false;
  showViewModal = false;
  
  clientForm: FormGroup;
  searchTerm = '';
  filterType = 'all';
  insuranceTypes = ['Motor', 'Life', 'Health', 'Property', 'Travel', 'Business'];
  
  // Loading and error states
  loading = false;
  error: string | null = null;
  
  // Statistics
  statistics: ClientStatistics | null = null;
  birthdays: Birthday[] = [];
  
  // Agent ID from session
  agentId: string | null = null;


  appointmentForm!: FormGroup;   // ✅ Angular form group, not Partial<Appointment>
  clientId!: string | null;

  constructor(
    private toastService: ToastService,

    private router: Router,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private clientsService: ClientsService,
    private sessionService: SessionService
  ) {
    this.clientForm = this.fb.group({
      firstName: ['', Validators.required],
      surname: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', Validators.required],
      nationalId: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      isClient: [false],
      insuranceType: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Get agent ID from session
    this.agentId = this.sessionService.getAgentId();
    console.log("Agent ID from session:", this.agentId);

    if (!this.agentId) {
      this.error = 'No agent session found. Please log in again.';
      this.sessionService.logout();
      return;
    }

    // Load initial data
    this.loadClients();
    this.loadStatistics();
    this.loadBirthdays();
  }

  private loadClients(): void {
    if (!this.agentId) return;

    this.loading = true;
    this.error = null;

    const filters: Partial<ClientSearchFilters> = {
      SearchTerm: this.searchTerm || undefined,
      FilterType: this.filterType as any,
      InsuranceType: undefined // Will be set by specific filters
    };

    this.clientsService.getAll(this.agentId, filters)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading clients:', error);
          this.error = 'Failed to load clients. Please try again.';
          return of([]);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe((clients) => {
        this.clients = this.mapBackendClientsToDisplay(clients);
        this.applyFilters();
      });
  }

  private loadStatistics(): void {
  if (!this.agentId) return;

  this.clientsService.getStatistics(this.agentId)
    .pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        console.error('Error loading statistics:', error);
        return of(null); // fallback
      })
    )
    .subscribe((stats) => {
      try {
        if (!stats || typeof stats !== 'object') {
          console.warn('Statistics response is null or not an object:', stats);
          this.statistics = {
            TotalContacts: 0,
            TotalClients: 0,
            TotalProspects: 0,
            TodayBirthdays: 0
          };
          return;
        }

        // Apply default values if some fields are missing
        this.statistics = {
          TotalContacts: Number(stats.TotalContacts) || 0,
          TotalClients: Number(stats.TotalClients) || 0,
          TotalProspects: Number(stats.TotalProspects) || 0,
          TodayBirthdays: Number(stats.TodayBirthdays) || 0,
          ActivePolicies: Number(stats.ActivePolicies) || 0,
          ExpiringPolicies: Number(stats.ExpiringPolicies) || 0,
          MonthBirthdays: Number(stats.MonthBirthdays) || 0,
          NewThisWeek: Number(stats.NewThisWeek) || 0,
          NewThisMonth: Number(stats.NewThisMonth) || 0,
          InsuranceTypeBreakdown: stats.InsuranceTypeBreakdown ?? ''
        };

      } catch (parseErr) {
        console.error('Error parsing statistics response:', parseErr, stats);
        this.statistics = {
          TotalContacts: 0,
          TotalClients: 0,
          TotalProspects: 0,
          TodayBirthdays: 0
        };
      }
    });
}


  private loadBirthdays(): void {
    if (!this.agentId) return;

    this.clientsService.getBirthdays(this.agentId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading birthdays:', error);
          return of([]);
        })
      )
      .subscribe((birthdays) => {
        this.birthdays = birthdays;
      });
  }

  private mapBackendClientsToDisplay(backendClients: Client[]): ClientDisplay[] {
    return backendClients.map(client => ({
      id: client.ClientId,
      firstName: client.FirstName,
      surname: client.Surname,
      lastName: client.LastName,
      phoneNumber: client.PhoneNumber,
      email: client.Email,
      address: client.Address,
      nationalId: client.NationalId,
      dateOfBirth: new Date(client.DateOfBirth),
      isClient: client.IsClient,
      insuranceType: client.InsuranceType,
      notes: client.Notes
    }));
  }

  private mapDisplayClientToBackend(displayClient: ClientDisplay, isCreate: boolean = false): CreateClientRequest | UpdateClientRequest {
    const baseData: CreateClientRequest = {
      AgentId: this.agentId!,
      FirstName: displayClient.firstName,
      Surname: displayClient.surname,
      LastName: displayClient.lastName,
      PhoneNumber: displayClient.phoneNumber,
      Email: displayClient.email,
      Address: displayClient.address,
      NationalId: displayClient.nationalId,
      DateOfBirth: displayClient.dateOfBirth.toISOString(),
      IsClient: displayClient.isClient,
      InsuranceType: displayClient.insuranceType,
      Notes: displayClient.notes
    };

    if (isCreate) {
      return baseData;
    } else {
      return {
        ...baseData,
        ClientId: displayClient.id
      } as UpdateClientRequest;
    }
  }

  onSearch(): void {
    if (this.searchTerm.length >= 2 || this.searchTerm.length === 0) {
      // Debounce search for better performance
      setTimeout(() => {
        this.loadClientsWithSearch();
      }, 300);
    } else {
      this.applyFilters();
    }
  }

  private loadClientsWithSearch(): void {
    if (!this.agentId) return;

    if (this.searchTerm.length >= 2) {
      this.loading = true;
      this.clientsService.search(this.agentId, this.searchTerm)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error('Error searching clients:', error);
            return of([]);
          }),
          finalize(() => this.loading = false)
        )
        .subscribe((clients) => {
          this.clients = this.mapBackendClientsToDisplay(clients);
          this.applyFilters();
        });
    } else {
      this.loadClients();
    }
  }

  private applyFilters(): void {
    this.filteredClients = this.clients.filter(client => {
      // Apply filter type
      if (this.filterType === 'clients' && !client.isClient) return false;
      if (this.filterType === 'prospects' && client.isClient) return false;

      // Apply search term (for local filtering)
      if (this.searchTerm && this.searchTerm.length < 2) {
        const searchLower = this.searchTerm.toLowerCase();
        return (
          client.firstName.toLowerCase().includes(searchLower) ||
          client.surname.toLowerCase().includes(searchLower) ||
          client.lastName.toLowerCase().includes(searchLower) ||
          client.phoneNumber.includes(this.searchTerm) ||
          client.email.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  openAddModal(): void {
    this.clientForm.reset();
    this.clientForm.patchValue({
      isClient: false
    });
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openEditModal(client: ClientDisplay): void {
    this.selectedClient = client;
    this.clientForm.patchValue({
      ...client,
      dateOfBirth: new Date(client.dateOfBirth).toISOString().split('T')[0]
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedClient = null;
  }

  openViewModal(client: ClientDisplay): void {
    this.selectedClient = client;
    this.loadClientWithDetails(client.id);
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedClient = null;
  }

  private loadClientWithDetails(clientId: string): void {
    if (!this.agentId) return;

    this.clientsService.getWithPolicies(this.agentId, clientId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading client details:', error);
          return of(null);
        })
      )
      .subscribe((clientDetails) => {
        if (clientDetails && this.selectedClient) {
          // Map policy data if available
          if (clientDetails.policies && clientDetails.policies.length > 0) {
            const policy = clientDetails.policies[0]; // Take first policy for display
            this.selectedClient.policy = {
              policyId: policy.PolicyId,
              name: policy.PolicyName,
              type: policy.PolicyType,
              companyName: policy.CompanyName,
              status: policy.Status,
              startDate: new Date(policy.StartDate),
              endDate: new Date(policy.EndDate),
              notes: policy.Notes
            };
          }
        }
      });
  }
onSubmit(): void {
  if (this.clientForm.valid && this.agentId) {
    const formData = { ...this.clientForm.value };
    formData.dateOfBirth = new Date(formData.dateOfBirth);

    this.loading = true;
    this.error = null;

    if (this.showAddModal) {
      // CREATE new client
      const createRequest: CreateClientRequest = this.mapDisplayClientToBackend(
        formData as ClientDisplay,
        true
      ) as CreateClientRequest;

      this.clientsService.create(createRequest)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error('Error creating client:', error);
            this.error = 'Failed to create client. Please try again.';

            this.toastService.show({
              type: 'error',
              title: 'Error',
              message: 'Failed to create client. Please try again.',
              duration: 4000
            });

            return of(null);
          }),
          finalize(() => this.loading = false)
        )
        .subscribe((newClient) => {
          if (newClient) {
            this.closeAddModal();
            this.loadClients();
            this.loadStatistics();

            this.toastService.show({
              type: 'success',
              title: 'Client Added',
              message: 'New client created successfully!',
              duration: 4000
            });
          }
        });

    } else if (this.showEditModal && this.selectedClient) {
      // UPDATE existing client
      const updateRequest: UpdateClientRequest = {
        ...this.mapDisplayClientToBackend(
          { ...this.selectedClient, ...formData },
          false
        ),
        ClientId: this.selectedClient.id
      };

      this.clientsService.update(updateRequest)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error('Error updating client:', error);
            this.error = 'Failed to update client. Please try again.';

            this.toastService.show({
              type: 'error',
              title: 'Error',
              message: 'Failed to update client. Please try again.',
              duration: 4000
            });

            return of(null);
          }),
          finalize(() => this.loading = false)
        )
        .subscribe((updatedClient) => {
          if (updatedClient) {
            this.closeEditModal();
            this.loadClients();
            this.loadStatistics();

            this.toastService.show({
              type: 'success',
              title: 'Client Updated',
              message: 'Client details updated successfully!',
              duration: 4000
            });
          }
        });
    }
  }
}

 prefillAppointment(client: ClientDisplay) {
    this.appointmentForm.patchValue({
      clientId: client.id,
      notes: client.notes ?? ''
    });
  }

deleteClient(clientId: string): void {
  if (!this.agentId) return;

  this.toastService.confirm('Are you sure you want to delete this client?', ['Yes', 'No'])
    .subscribe(action => {
      if (action === 'yes') {
        this.loading = true;

        this.clientsService.delete(this.agentId!, clientId)
          .pipe(
            takeUntil(this.destroy$),
            catchError((error) => {
              console.error('Error deleting client:', error);
              this.toastService.show({
                type: 'error',
                title: 'Delete Failed',
                message: 'Failed to delete client. Please try again.',
                duration: 4000   // ✅ auto-close after 4s
              });
              return of({ success: false });
            }),
            finalize(() => this.loading = false)
          )
          .subscribe((response) => {
            if (response.success) {
              this.loadClients();
              this.loadStatistics();

              this.toastService.show({
                type: 'success',
                title: 'Client Deleted',
                message: 'Client deleted successfully.',
                duration: 3000   // ✅ auto-close after 3s
              });
            }
          });
      }
    });
}



  convertToClient(client: ClientDisplay): void {
    if (!this.agentId) return;

    this.loading = true;

    this.clientsService.convert(this.agentId, client.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error converting to client:', error);

          // 🚨 Error Toast
          this.toastService.show({
            type: 'error',
            title: 'Conversion Failed',
            message: 'Failed to convert prospect to client. Please try again.',
            duration: 5000, // auto-close after 5s
            center: true
          });

          return of({ success: false });
        }),
        finalize(() => this.loading = false)
      )
      .subscribe((response) => {
        if (response.success) {
          // ✅ Success Toast
          this.toastService.show({
            type: 'success',
            title: 'Conversion Successful',
            message: `${client.firstName} has been converted to a client.Visit Policy Page to set Up policy`,
            duration: 4000,
            center: true
          });

          this.loadClients();     // Refresh the list
          this.loadStatistics();  // Refresh statistics
        }
      });
  }

  // Updated methods to use statistics from backend
  getClientCount(): number {
    return this.statistics?.TotalClients || this.clients.filter(c => c.isClient).length;
  }

  getProspectCount(): number {
    return this.statistics?.TotalProspects || this.clients.filter(c => !c.isClient).length;
  }

  getTotalCount(): number {
    return this.statistics?.TotalContacts || this.clients.length;
  }

  // Helper methods remain the same
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB');
  }

  calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Method to refresh data
  refreshData(): void {
    this.loadClients();
    this.loadStatistics();
    this.loadBirthdays();
  }

  // Method to clear error
  clearError(): void {
    this.error = null;
  }

  // TrackBy function for performance optimization
  trackByClientId(index: number, client: ClientDisplay): string {
    return client.id;
  }
bookAppointment(client: ClientDisplay) {
  this.router.navigate(['/appointments/book'], {
    state: {
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      clientPhone: client.phoneNumber,
      clientEmail: client.email,
      clientNotes: client.notes ?? ''
    }
  });
}


}