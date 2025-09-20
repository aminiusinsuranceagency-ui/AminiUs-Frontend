import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, catchError, of, finalize, forkJoin } from 'rxjs';

// Services
import { ClientsService } from '../../services/clients.service';
import { ProspectsService } from '../../services/prospects.service';
import { SessionService } from '../../services/session.service';
import { ToastService } from '../../services/toast.service';

// Interfaces
import {
  Client,
  ClientWithDetails,
  CreateClientRequest,
  UpdateClientRequest,
  ClientSearchFilters,
  ClientStatistics,
  Birthday
} from '../../interfaces/client';

import {
  Prospect,
  ProspectExternalPolicy,
  ProspectStatistics,
  AddProspectRequest,
  AddProspectPolicyRequest,
  UpdateProspectRequest,
  ConvertProspectToClientRequest
} from '../../interfaces/prospects';

// Unified display interfaces
export interface UnifiedContact {
  id: string;
  firstName: string;
  surname: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  address?: string;
  nationalId?: string;
  dateOfBirth?: Date;
  isClient: boolean;
  insuranceType?: string;
  notes?: string;
  type: 'client' | 'prospect' | 'prospect_with_policy';
  policies?: PolicyDisplay[];
  hasExternalPolicies?: boolean;
}

export interface PolicyDisplay {
  policyId: string;
  name: string;
  type: string;
  companyName: string;
  status: 'Active' | 'Inactive' | 'Expired' | 'Lapsed';
  startDate?: Date;
  endDate?: Date;
  expiryDate?: Date;
  notes?: string;
}

export interface TabStatistics {
  clients: {
    total: number;
    activePolicies: number;
    expiringPolicies: number;
    newThisWeek: number;
  };
  prospects: {
    total: number;
    newThisWeek: number;
  };
  prospectsWithPolicies: {
    total: number;
    expiringIn7Days: number;
    expiringIn30Days: number;
    expired: number;
  };
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
  
  // Tab management
  activeTab: 'clients' | 'prospects' | 'prospects_with_policies' = 'clients';
  
  // Data arrays
  clients: Client[] = [];
  prospects: Prospect[] = [];
  prospectsWithPolicies: Prospect[] = [];
  prospectPolicies: Map<string, ProspectExternalPolicy[]> = new Map();
  
  // Filtered and displayed data
  filteredContacts: UnifiedContact[] = [];
  selectedContact: UnifiedContact | null = null;
  
  // Modal states
  showAddModal = false;
  showEditModal = false;
  showViewModal = false;
  showAddPolicyModal = false;
  
  // Forms
  contactForm!: FormGroup;
  policyForm!: FormGroup;
  
  // Search and filter
  searchTerm = '';
  filterType = 'all';
  insuranceTypes = ['Motor', 'Life', 'Health', 'Property', 'Travel', 'Business'];
  
  // Loading and error states
  loading = false;
  error: string | null = null;
  
  // Statistics
  tabStatistics: TabStatistics = {
    clients: { total: 0, activePolicies: 0, expiringPolicies: 0, newThisWeek: 0 },
    prospects: { total: 0, newThisWeek: 0 },
    prospectsWithPolicies: { total: 0, expiringIn7Days: 0, expiringIn30Days: 0, expired: 0 }
  };
  birthdays: Birthday[] = [];
  
  // Agent ID
  agentId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private clientsService: ClientsService,
    private prospectsService: ProspectsService,
    private sessionService: SessionService,
    private toastService: ToastService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      surname: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
      email: ['', [Validators.required, Validators.email]],
      address: [''],
      nationalId: [''],
      dateOfBirth: [''],
      isClient: [false],
      insuranceType: [''],
      notes: ['']
    });

    this.policyForm = this.fb.group({
      companyName: ['', Validators.required],
      policyNumber: [''],
      policyType: ['', Validators.required],
      expiryDate: [''],
      notes: ['']
    });
  }

  private initializeComponent(): void {
    this.agentId = this.sessionService.getAgentId();
    
    if (!this.agentId) {
      this.error = 'No agent session found. Please log in again.';
      this.sessionService.logout();
      return;
    }

    this.loadAllData();
  }

  private loadAllData(): void {
    this.loading = true;
    this.error = null;

    const requests$ = [
      this.clientsService.getAll(this.agentId!),
      this.prospectsService.getAgentProspects(this.agentId!),
      this.clientsService.getStatistics(this.agentId!),
      this.prospectsService.getProspectStatistics(this.agentId!),
      this.clientsService.getBirthdays(this.agentId!)
    ];

    forkJoin(requests$)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading data:', error);
          this.error = 'Failed to load data. Please try again.';
          return of([[], [], null, null, []]);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe((responses: any[]) => {
        const [clients, prospects, clientStats, prospectStats, birthdays] = responses;
        
        this.clients = (clients as Client[]) || [];
        this.prospects = (prospects as Prospect[]) || [];
        this.birthdays = (birthdays as Birthday[]) || [];
        
        this.updateStatistics(clientStats, prospectStats);
        this.loadProspectPolicies();
        this.applyFilters();
      });
  }

  private loadProspectPolicies(): void {
    // Load external policies for all prospects
    const policyRequests$ = this.prospects.map(prospect =>
      this.prospectsService.getProspectPolicies(prospect.ProspectId)
        .pipe(
          catchError(() => of([])),
          takeUntil(this.destroy$)
        )
    );

    if (policyRequests$.length > 0) {
      forkJoin(policyRequests$).subscribe((policiesArrays) => {
        this.prospectPolicies.clear();
        this.prospectsWithPolicies = [];

        policiesArrays.forEach((policies, index) => {
          const prospect = this.prospects[index];
          if (policies && policies.length > 0) {
            this.prospectPolicies.set(prospect.ProspectId, policies);
            this.prospectsWithPolicies.push(prospect);
          }
        });

        this.applyFilters();
      });
    }
  }

  private updateStatistics(clientStats: any, prospectStats: any): void {
    // Update client statistics
    if (clientStats) {
      this.tabStatistics.clients = {
        total: clientStats.TotalClients || 0,
        activePolicies: clientStats.ActivePolicies || 0,
        expiringPolicies: clientStats.ExpiringPolicies || 0,
        newThisWeek: clientStats.NewThisWeek || 0
      };
    }

    // Update prospect statistics
    if (prospectStats) {
      this.tabStatistics.prospects = {
        total: prospectStats.TotalProspects || 0,
        newThisWeek: 0 // This would need to be added to the API
      };

      this.tabStatistics.prospectsWithPolicies = {
        total: prospectStats.ProspectsWithPolicies || 0,
        expiringIn7Days: prospectStats.ExpiringIn7Days || 0,
        expiringIn30Days: prospectStats.ExpiringIn30Days || 0,
        expired: prospectStats.ExpiredPolicies || 0
      };
    }
  }

  // Tab Management
  switchTab(tab: 'clients' | 'prospects' | 'prospects_with_policies'): void {
    this.activeTab = tab;
    this.searchTerm = '';
    this.filterType = 'all';
    this.applyFilters();
  }

  // Data Mapping and Filtering
  private applyFilters(): void {
    let sourceData: UnifiedContact[] = [];

    switch (this.activeTab) {
      case 'clients':
        sourceData = this.mapClientsToUnified(this.clients.filter(c => c.IsClient));
        break;
      case 'prospects':
        sourceData = this.mapProspectsToUnified(
          this.prospects.filter(p => !this.prospectsWithPolicies.some(pwp => pwp.ProspectId === p.ProspectId))
        );
        break;
      case 'prospects_with_policies':
        sourceData = this.mapProspectsWithPoliciesToUnified(this.prospectsWithPolicies);
        break;
    }

    // Apply search filter
    if (this.searchTerm && this.searchTerm.length >= 2) {
      const searchLower = this.searchTerm.toLowerCase();
      sourceData = sourceData.filter(contact =>
        contact.firstName.toLowerCase().includes(searchLower) ||
        contact.surname.toLowerCase().includes(searchLower) ||
        contact.lastName.toLowerCase().includes(searchLower) ||
        contact.phoneNumber.includes(this.searchTerm) ||
        (contact.email && contact.email.toLowerCase().includes(searchLower))
      );
    }

    // Apply type filter
    if (this.filterType !== 'all') {
      sourceData = sourceData.filter(contact => {
        if (this.filterType === 'clients') return contact.isClient;
        if (this.filterType === 'prospects') return !contact.isClient;
        return true;
      });
    }

    this.filteredContacts = sourceData;
  }

  private mapClientsToUnified(clients: Client[]): UnifiedContact[] {
    return clients.map(client => ({
      id: client.ClientId,
      firstName: client.FirstName,
      surname: client.Surname,
      lastName: client.LastName,
      phoneNumber: client.PhoneNumber,
      email: client.Email,
      address: client.Address,
      nationalId: client.NationalId,
      dateOfBirth: client.DateOfBirth ? new Date(client.DateOfBirth) : undefined,
      isClient: client.IsClient,
      insuranceType: client.InsuranceType,
      notes: client.Notes,
      type: 'client',
      hasExternalPolicies: false
    }));
  }

  private mapProspectsToUnified(prospects: Prospect[]): UnifiedContact[] {
    return prospects.map(prospect => ({
      id: prospect.ProspectId,
      firstName: prospect.FirstName,
      surname: prospect.Surname || '',
      lastName: prospect.LastName || '',
      phoneNumber: prospect.PhoneNumber || '',
      email: prospect.Email || '',
      isClient: false,
      notes: prospect.Notes,
      type: 'prospect',
      hasExternalPolicies: false
    }));
  }

  private mapProspectsWithPoliciesToUnified(prospects: Prospect[]): UnifiedContact[] {
    return prospects.map(prospect => {
      const policies = this.prospectPolicies.get(prospect.ProspectId) || [];
      const mappedPolicies: PolicyDisplay[] = policies.map(policy => ({
        policyId: policy.ExtPolicyId,
        name: policy.PolicyNumber || 'Unknown Policy',
        type: policy.PolicyType || 'Unknown',
        companyName: policy.CompanyName,
        status: this.determineExternalPolicyStatus(policy.ExpiryDate),
        expiryDate: policy.ExpiryDate ? new Date(policy.ExpiryDate) : undefined,
        notes: policy.Notes
      }));

      return {
        id: prospect.ProspectId,
        firstName: prospect.FirstName,
        surname: prospect.Surname || '',
        lastName: prospect.LastName || '',
        phoneNumber: prospect.PhoneNumber || '',
        email: prospect.Email || '',
        isClient: false,
        notes: prospect.Notes,
        type: 'prospect_with_policy',
        policies: mappedPolicies,
        hasExternalPolicies: true
      };
    });
  }

  private determineExternalPolicyStatus(expiryDate?: Date): 'Active' | 'Expired' {
    if (!expiryDate) return 'Active';
    return new Date(expiryDate) > new Date() ? 'Active' : 'Expired';
  }

  // Modal Management
  openAddModal(): void {
    this.contactForm.reset();
    this.setupFormForTab();
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openEditModal(contact: UnifiedContact): void {
    this.selectedContact = contact;
    this.populateEditForm(contact);
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedContact = null;
  }

  openViewModal(contact: UnifiedContact): void {
    this.selectedContact = contact;
    this.loadContactDetails(contact);
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedContact = null;
  }

  openAddPolicyModal(contact: UnifiedContact): void {
    this.selectedContact = contact;
    this.policyForm.reset();
    this.showAddPolicyModal = true;
  }

  closeAddPolicyModal(): void {
    this.showAddPolicyModal = false;
    this.selectedContact = null;
  }

  private setupFormForTab(): void {
    const isClientTab = this.activeTab === 'clients';
    
    if (isClientTab) {
      // For clients, make address, nationalId, dateOfBirth, insuranceType required
      this.contactForm.get('address')?.setValidators([Validators.required]);
      this.contactForm.get('nationalId')?.setValidators([Validators.required]);
      this.contactForm.get('dateOfBirth')?.setValidators([Validators.required]);
      this.contactForm.get('insuranceType')?.setValidators([Validators.required]);
      this.contactForm.patchValue({ isClient: true });
    } else {
      // For prospects, make these fields optional
      this.contactForm.get('address')?.clearValidators();
      this.contactForm.get('nationalId')?.clearValidators();
      this.contactForm.get('dateOfBirth')?.clearValidators();
      this.contactForm.get('insuranceType')?.clearValidators();
      this.contactForm.patchValue({ isClient: false });
    }
    
    this.contactForm.updateValueAndValidity();
  }

  private populateEditForm(contact: UnifiedContact): void {
    this.contactForm.patchValue({
      firstName: contact.firstName,
      surname: contact.surname,
      lastName: contact.lastName,
      phoneNumber: contact.phoneNumber,
      email: contact.email,
      address: contact.address || '',
      nationalId: contact.nationalId || '',
      dateOfBirth: contact.dateOfBirth ? 
        new Date(contact.dateOfBirth).toISOString().split('T')[0] : '',
      isClient: contact.isClient,
      insuranceType: contact.insuranceType || '',
      notes: contact.notes || ''
    });
  }

  private loadContactDetails(contact: UnifiedContact): void {
    if (contact.type === 'client') {
      // Load client with policies
      this.clientsService.getWithPolicies(this.agentId!, contact.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(clientDetails => {
          // Handle client details if needed
        });
    }
  }

  // Form Submissions
  onSubmit(): void {
    if (!this.contactForm.valid || !this.agentId) return;

    const formData = { ...this.contactForm.value };
    
    this.loading = true;
    this.error = null;

    if (this.showAddModal) {
      this.createContact(formData);
    } else if (this.showEditModal && this.selectedContact) {
      this.updateContact(formData);
    }
  }

  private createContact(formData: any): void {
    if (this.activeTab === 'clients' || formData.isClient) {
      this.createClient(formData);
    } else {
      this.createProspect(formData);
    }
  }

  private createClient(formData: any): void {
    const createRequest: CreateClientRequest = {
      AgentId: this.agentId!,
      FirstName: formData.firstName,
      Surname: formData.surname,
      LastName: formData.lastName,
      PhoneNumber: formData.phoneNumber,
      Email: formData.email,
      Address: formData.address,
      NationalId: formData.nationalId,
      DateOfBirth: new Date(formData.dateOfBirth).toISOString(),
      IsClient: true,
      InsuranceType: formData.insuranceType,
      Notes: formData.notes
    };

    this.clientsService.create(createRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error creating client:', error);
          this.error = 'Failed to create client. Please try again.';
          this.showToast('error', 'Error', 'Failed to create client. Please try again.');
          return of(null);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe(response => {
        if (response) {
          this.closeAddModal();
          this.loadAllData();
          this.showToast('success', 'Client Created', 'New client created successfully!');
        }
      });
  }

  private createProspect(formData: any): void {
    const createRequest: AddProspectRequest = {
      AgentId: this.agentId!,
      FirstName: formData.firstName,
      Surname: formData.surname,
      LastName: formData.lastName,
      PhoneNumber: formData.phoneNumber,
      Email: formData.email,
      Notes: formData.notes
    };

    this.prospectsService.addProspect(createRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error creating prospect:', error);
          this.error = 'Failed to create prospect. Please try again.';
          this.showToast('error', 'Error', 'Failed to create prospect. Please try again.');
          return of(null);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe(response => {
        if (response?.Success) {
          this.closeAddModal();
          this.loadAllData();
          this.showToast('success', 'Prospect Created', 'New prospect created successfully!');
        }
      });
  }

  private updateContact(formData: any): void {
    if (!this.selectedContact) return;

    if (this.selectedContact.type === 'client') {
      this.updateClient(formData);
    } else {
      this.updateProspect(formData);
    }
  }

  private updateClient(formData: any): void {
    const updateRequest: UpdateClientRequest = {
      ClientId: this.selectedContact!.id,
      AgentId: this.agentId!,
      FirstName: formData.firstName,
      Surname: formData.surname,
      LastName: formData.lastName,
      PhoneNumber: formData.phoneNumber,
      Email: formData.email,
      Address: formData.address,
      NationalId: formData.nationalId,
      DateOfBirth: new Date(formData.dateOfBirth).toISOString(),
      IsClient: formData.isClient,
      InsuranceType: formData.insuranceType,
      Notes: formData.notes
    };

    this.clientsService.update(updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error updating client:', error);
          this.error = 'Failed to update client. Please try again.';
          this.showToast('error', 'Error', 'Failed to update client. Please try again.');
          return of(null);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe(response => {
        if (response) {
          this.closeEditModal();
          this.loadAllData();
          this.showToast('success', 'Client Updated', 'Client updated successfully!');
        }
      });
  }

  private updateProspect(formData: any): void {
    const updateRequest: UpdateProspectRequest = {
      FirstName: formData.firstName,
      Surname: formData.surname,
      LastName: formData.lastName,
      PhoneNumber: formData.phoneNumber,
      Email: formData.email,
      Notes: formData.notes
    };

    this.prospectsService.updateProspect(this.selectedContact!.id, updateRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error updating prospect:', error);
          this.error = 'Failed to update prospect. Please try again.';
          this.showToast('error', 'Error', 'Failed to update prospect. Please try again.');
          return of(null);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe(response => {
        if (response?.Success) {
          this.closeEditModal();
          this.loadAllData();
          this.showToast('success', 'Prospect Updated', 'Prospect updated successfully!');
        }
      });
  }

  // Policy Management
  onAddPolicy(): void {
    if (!this.policyForm.valid || !this.selectedContact) return;

    const formData = this.policyForm.value;
    const addPolicyRequest: AddProspectPolicyRequest = {
      ProspectId: this.selectedContact.id,
      CompanyName: formData.companyName,
      PolicyNumber: formData.policyNumber,
      PolicyType: formData.policyType,
      ExpiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
      Notes: formData.notes
    };

    this.loading = true;
    this.prospectsService.addProspectPolicy(addPolicyRequest)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error adding policy:', error);
          this.error = 'Failed to add policy. Please try again.';
          this.showToast('error', 'Error', 'Failed to add policy. Please try again.');
          return of(null);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe(response => {
        if (response?.Success) {
          this.closeAddPolicyModal();
          this.loadAllData();
          this.showToast('success', 'Policy Added', 'External policy added successfully!');
        }
      });
  }

  // Contact Actions
  deleteContact(contact: UnifiedContact): void {
    this.toastService.confirm(
      `Are you sure you want to delete this ${contact.type === 'client' ? 'client' : 'prospect'}?`,
      ['Yes', 'No']
    ).subscribe(action => {
      if (action === 'yes') {
        this.performDelete(contact);
      }
    });
  }

  private performDelete(contact: UnifiedContact): void {
    this.loading = true;

    if (contact.type === 'client') {
      // Handle client deletion
      this.clientsService.delete(this.agentId!, contact.id)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error deleting client:', error);
            this.error = 'Failed to delete client. Please try again.';
            this.showToast('error', 'Delete Failed', 'Failed to delete client. Please try again.');
            return of({ success: false });
          }),
          finalize(() => this.loading = false)
        )
        .subscribe((response: { success: boolean }) => {
          if (response.success) {
            this.loadAllData();
            this.showToast('success', 'Client Deleted', 'Client deleted successfully!');
          }
        });
    } else {
      // Handle prospect deletion
      this.prospectsService.deleteProspect(contact.id)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error deleting prospect:', error);
            this.error = 'Failed to delete prospect. Please try again.';
            this.showToast('error', 'Delete Failed', 'Failed to delete prospect. Please try again.');
            return of({ Success: false });
          }),
          finalize(() => this.loading = false)
        )
        .subscribe((response: { Success: boolean }) => {
          if (response.Success) {
            this.loadAllData();
            this.showToast('success', 'Prospect Deleted', 'Prospect deleted successfully!');
          }
        });
    }
  }

  convertProspectToClient(contact: UnifiedContact): void {
    if (contact.type === 'client') return;

    // For prospects without required client fields, show conversion form
    if (!contact.address || !contact.nationalId || !contact.dateOfBirth) {
      this.openConversionModal(contact);
      return;
    }

    this.performConversion(contact, {});
  }

  private openConversionModal(contact: UnifiedContact): void {
    // This would open a modal to collect missing required fields
    // For now, we'll just show a toast asking for the missing info
    this.showToast('info', 'Missing Information', 
      'Please edit the prospect to add address, national ID, and date of birth before converting to client.');
  }

  private performConversion(contact: UnifiedContact, conversionData: ConvertProspectToClientRequest): void {
    this.loading = true;
    
    this.prospectsService.convertProspectToClient(contact.id, conversionData)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error converting prospect:', error);
          this.error = 'Failed to convert prospect. Please try again.';
          this.showToast('error', 'Error', 'Failed to convert prospect. Please try again.');
          return of(null);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe(response => {
        if (response?.Success) {
          this.loadAllData();
          this.showToast('success', 'Conversion Successful', 
            `${contact.firstName} has been converted to a client!`);
        }
      });
  }

  // Search and Filter
  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  // Utility Methods
  getDisplayName(contact: UnifiedContact): string {
    return `${contact.firstName} ${contact.surname} ${contact.lastName}`.trim();
  }

  getTabCount(tab: string): number {
    switch (tab) {
      case 'clients': return this.tabStatistics.clients.total;
      case 'prospects': return this.tabStatistics.prospects.total;
      case 'prospects_with_policies': return this.tabStatistics.prospectsWithPolicies.total;
      default: return 0;
    }
  }

  refreshData(): void {
    this.loadAllData();
  }

  clearError(): void {
    this.error = null;
  }

  trackByContactId(index: number, contact: UnifiedContact): string {
    return contact.id;
  }

  // Helper Methods
  private handleError(message: string, error?: any): void {
    console.error(message, error);
    this.error = message;
    this.showToast('error', 'Error', message);
  }

  private showToast(type: 'success' | 'error' | 'info', title: string, message: string): void {
    this.toastService.show({
      type,
      title,
      message,
      duration: 4000
    });
  }

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

  getPriorityColorClass(priority: 'High' | 'Medium' | 'Low'): string {
    return this.prospectsService.getPriorityColorClass(priority);
  }

  formatExpiryDate(date: Date): string {
    return this.prospectsService.formatExpiryDate(date);
  }

  getDaysUntilExpiryText(days: number): string {
    return this.prospectsService.getDaysUntilExpiryText(days);
  }
}