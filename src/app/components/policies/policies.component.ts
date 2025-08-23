// policies.component.ts - Updated with Client Service Integration and Policy Maturity Logic
import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { Subject, Observable, BehaviorSubject, combineLatest, of, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith, catchError, map } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';

// Import your services and interfaces
import { PolicyService } from '../../services/policies.service';
import { ClientsService } from '../../services/clients.service';
import { AutocompleteService, Company, PolicyType, PolicyCategory, PolicyCatalogItem, PolicyTemplate } from '../../services/autocomplete.service';
import { SessionService } from '../../services/session.service';

// Import your interfaces
import {
  ClientPolicy,
  PolicyCatalog,
  InsuranceCompany,
  PolicyTemplate as PolicyTemplateInterface,
  PolicyCategory as PolicyCategoryInterface,
  PolicyType as PolicyTypeInterface,
  CreateClientPolicyRequest,
  CreatePolicyCatalogRequest,
  CreatePolicyTemplateRequest,
  CreateInsuranceCompanyRequest,
  CreatePolicyTypeRequest,
  CreatePolicyCategoryRequest,
  UpdateClientPolicyRequest,
  AgentDashboardSummary,
  PolicyStatus,
  PolicyRenewalRequest,
  PolicyStatistics,
  PolicyStatisticsDetailed,
  PolicyHistory
} from '../../interfaces/policy';

// Updated interfaces for ClientWithPolicies
import { ClientWithPolicies, ClientPolicyLite, ClientWithPoliciesFilter, PolicyResponse } from '../../interfaces/CLIENTS-POLICY';

// Client interface from client service
interface Client {
  ClientId: string;
  FirstName: string;
  Surname: string;
  LastName: string;
  Email: string;
  PhoneNumber: string;
}

// Enhanced client policy with client name - now using ClientPolicyLite structure
interface EnhancedClientPolicy extends ClientPolicyLite {
  clientName: string;
  clientEmail?: string;
  clientId: string;
}

// Policy dropdown option
interface PolicyDropdownOption {
  policyId: string;
  policyName: string;
}

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

// Confirmation action
interface ConfirmationAction {
  title: string;
  message: string;
  actionText: string;
  actionClass: string;
  callback: () => void;
}

// Maturity period interface
interface MaturityPeriod {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  isMatured: boolean;
}

// Date range validator
function dateRangeValidator(control: AbstractControl): { [key: string]: any } | null {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return { 'dateRangeInvalid': { message: 'Start date must be before end date' } };
    }
  }
  
  return null;
}

@Component({
  selector: 'app-policies',
  standalone: true,
  templateUrl: './policies.component.html',
  styleUrls: ['./policies.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class PoliciesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchTerms$ = new BehaviorSubject<string>('');
  
  // Current user info
  currentAgentId: string = '';
  
  // Active tab management
  activeTab: string = 'dashboard';
  
  // Loading states
  isLoading = false;
  isSubmitting = false;
  isLoadingClients = false;
  
  // Data arrays - Updated to use ClientWithPolicies structure
  clientsWithPolicies: ClientWithPolicies[] = [];
  clientPolicies: EnhancedClientPolicy[] = [];
  policyCatalog: PolicyCatalog[] = [];
  companies: InsuranceCompany[] = [];
  policyTypes: PolicyTypeInterface[] = [];
  policyCategories: PolicyCategoryInterface[] = [];
  policyTemplates: PolicyTemplateInterface[] = [];
  
  // Policy dropdown options
  policyDropdownOptions: PolicyDropdownOption[] = [];
  
  // Filtered data
  filteredPolicies: EnhancedClientPolicy[] = [];
  filteredCatalog: PolicyCatalog[] = [];
  
  // Dashboard data
  dashboardSummary: AgentDashboardSummary | null = null;
  policyStatistics: PolicyStatistics | null = null;
  policyStatisticsDetailed: PolicyStatisticsDetailed[] = [];
  
  // Policy History
  policyHistory: PolicyHistory[] = [];
  selectedClientForHistory: string | null = null;
  showHistoryModal = false;
  
  // Form groups
  clientPolicyForm!: FormGroup;
  catalogForm!: FormGroup;
  templateForm!: FormGroup;
  companyForm!: FormGroup;
  typeForm!: FormGroup;
  categoryForm!: FormGroup;
  
  // Modal states
  showClientPolicyModal = false;
  showCatalogModal = false;
  showTemplateModal = false;
  showCompanyModal = false;
  showTypeModal = false;
  showCategoryModal = false;
  showConfirmationModal = false;
  
  // Edit states
  editingPolicy: EnhancedClientPolicy | null = null;
  editingCatalogItem: PolicyCatalog | null = null;
  editingTemplate: PolicyTemplateInterface | null = null;
  editingCompany: InsuranceCompany | null = null;
  editingType: PolicyTypeInterface | null = null;
  editingCategory: PolicyCategoryInterface | null = null;
  
  // Search and filter
  searchTerm = '';
  selectedStatus = '';
  selectedCompany = '';
  selectedType = '';
  
  // Autocomplete options
  autocompleteCompanies: Company[] = [];
  autocompleteTypes: PolicyType[] = [];
  autocompleteCategories: PolicyCategory[] = [];
  autocompleteCatalog: PolicyCatalogItem[] = [];
  autocompleteTemplates: PolicyTemplate[] = [];
  
  // Client autocomplete
  clientSearchTerm = '';
  clientSearchResults: Client[] = [];
  selectedClientId = '';
  
  // Policy statuses
  policyStatuses = Object.values(PolicyStatus);
  
  // Bulk operations
  selectedPolicyIds: string[] = [];
  
  // Toast notifications
  toastMessage = '';
  toastType: ToastType = 'info';
  private toastTimeout?: number;
  
  // Confirmation modal
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationActionText = '';
  confirmationActionClass = '';
  private confirmationCallback?: () => void;

  // Catalog autocomplete
  catalogPolicyNameSuggestions: PolicyCatalogItem[] = [];
  catalogPolicyNameSearchTerm = '';
  
  constructor(
    private policyService: PolicyService,
    private clientsService: ClientsService,
    private autocompleteService: AutocompleteService,
    private sessionService: SessionService,
    private fb: FormBuilder
  ) {
    this.currentAgentId = this.sessionService.getAgentId() || '';
    this.initializeForms();
  }
  
  ngOnInit(): void {
    this.loadInitialData();
    this.setupSearch();
    this.loadAutocompleteData();
    this.setupClientSearch();
    this.loadPolicyDropdownOptions();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  private initializeForms(): void {
    // Updated client policy form with policyId dropdown
    this.clientPolicyForm = this.fb.group({
      clientId: ['', Validators.required],
      policyId: ['', Validators.required], // Changed from policyName to policyId for dropdown
      status: ['Active'],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      notes: ['']
    }, { validators: dateRangeValidator });
    
    this.catalogForm = this.fb.group({
      policyName: ['', Validators.required],
      companyId: ['', Validators.required],
      notes: [''],
      categoryId: [''],
      typeId: ['']
    });
    
    this.templateForm = this.fb.group({
      templateName: ['', Validators.required],
      defaultTermMonths: [12],
      defaultPremium: [0],
      coverageDescription: [''],
      terms: [''],
      categoryId: [''],
      policyCatalogId: [''],
      typeId: ['']
    });
    
    this.companyForm = this.fb.group({
      companyName: ['', Validators.required]
    });
    
    this.typeForm = this.fb.group({
      typeName: ['', Validators.required]
    });
    
    this.categoryForm = this.fb.group({
      categoryName: ['', Validators.required],
      description: ['']
    });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    
    // Load all data in parallel using the new getClientsWithPolicies method
    forkJoin({
      dashboard: this.policyService.getMyDashboard(),
      clientsWithPolicies: this.policyService.getClientsWithPolicies({ 
        agentId: this.currentAgentId,
        includeInactive: false 
      }),
      catalog: this.policyService.getMyCatalog(),
      statistics: this.policyService.getPolicyStatistics({ agentId: this.currentAgentId }),
      statisticsDetailed: this.policyService.getPolicyStatisticsDetailed({ agentId: this.currentAgentId })
    }).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.showToast('Error loading data: ' + error.message, 'error');
        return of({
          dashboard: null,
          clientsWithPolicies: [],
          catalog: [],
          statistics: null,
          statisticsDetailed: []
        });
      })
    ).subscribe({
      next: (data) => {
        this.dashboardSummary = data.dashboard;
        this.policyStatistics = data.statistics;
        this.policyStatisticsDetailed = data.statisticsDetailed;
        
        // Process clients with policies data
        this.clientsWithPolicies = data.clientsWithPolicies;
        this.processClientsWithPolicies(data.clientsWithPolicies);
        
        this.policyCatalog = data.catalog;
        this.filteredCatalog = [...this.policyCatalog];
        
        this.updateMaturedPoliciesStatus();
        this.isLoading = false;
      },
      error: (error) => {
        this.showToast('Error loading initial data: ' + error.message, 'error');
        this.isLoading = false;
      }
    });
    
    // Load reference data
    this.loadReferenceData();
  }
  
  private processClientsWithPolicies(clientsWithPolicies: any[]): void {
    console.log("🔍 Raw clientsWithPolicies received:", clientsWithPolicies);

    this.clientPolicies = clientsWithPolicies.map(row => {
      const enhancedPolicy: EnhancedClientPolicy = {
        policyId: row.policyId,
        policyName: row.policyName,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        typeId: row.typeId,
        typeName: row.typeName,
        companyId: row.companyId,
        companyName: row.companyName,
        clientId: row.clientId,
        clientName: row.fullName || `${row.firstName} ${row.surname} ${row.lastName}`.trim(),
        clientEmail: row.email,
        daysUntilExpiry: this.calculateDaysUntilMaturity(row.endDate),
        notes: row.notes, // Include notes from the policy

        // Required extra fields
        createdDate: row.policyCreatedDate,
        modifiedDate: row.policyModifiedDate,
        isActive: row.policyIsActive,
        policyCatalogId: row.policyCatalogId,
        catalogPolicyName: row.catalogPolicyName
      };
      return enhancedPolicy;
    });

    console.log("✅ Enhanced clientPolicies created:", this.clientPolicies);

    this.filteredPolicies = [...this.clientPolicies];
    this.applyFilters();
  }
  
  private loadPolicyDropdownOptions(): void {
    this.policyService.getPolicyNameDropDown(this.currentAgentId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.showToast('Error loading policy options: ' + error.message, 'error');
          return of([]);
        })
      )
      .subscribe((options) => {
        this.policyDropdownOptions = options;
      });
  }
  
  private loadReferenceData(): void {
    forkJoin({
      companies: this.policyService.getInsuranceCompanies(),
      types: this.policyService.getPolicyTypes(),
      categories: this.policyService.getPolicyCategories(),
      templates: this.policyService.getPolicyTemplates({ agentId: this.currentAgentId })
    }).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.showToast('Error loading reference data: ' + error.message, 'error');
        return of({
          companies: [],
          types: [],
          categories: [],
          templates: []
        });
      })
    ).subscribe((data) => {
      this.companies = data.companies;
      this.policyTypes = data.types;
      this.policyCategories = data.categories;
      this.policyTemplates = data.templates;
    });
  }
  
  private loadAutocompleteData(): void {
    forkJoin({
      companies: this.autocompleteService.getCompanies(),
      types: this.autocompleteService.getPolicyTypes(),
      categories: this.autocompleteService.getPolicyCategories()
    }).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.showToast('Error loading autocomplete data: ' + error.message, 'error');
        return of({
          companies: [],
          types: [],
          categories: []
        });
      })
    ).subscribe((data) => {
      this.autocompleteCompanies = data.companies;
      this.autocompleteTypes = data.types;
      this.autocompleteCategories = data.categories;
    });
  }
  
  private setupSearch(): void {
    this.searchTerms$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.applyFilters();
    });
  }
  
  private setupClientSearch(): void {
    // Client search is handled in onClientSearch method
  }
  
  // ============================================
  // MATURITY CALCULATION METHODS
  // ============================================
  
  private calculateDaysUntilMaturity(endDate: string | Date): number {
    const today = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  
  private calculateMaturityPeriod(endDate: string | Date): MaturityPeriod {
    const today = new Date();
    const end = new Date(endDate);
    
    const totalDays = this.calculateDaysUntilMaturity(endDate);
    const isMatured = totalDays < 0;
    
    if (isMatured) {
      // For matured policies, calculate how long ago they matured
      const daysPastMaturity = Math.abs(totalDays);
      const years = Math.floor(daysPastMaturity / 365);
      const remainingDaysAfterYears = daysPastMaturity % 365;
      const months = Math.floor(remainingDaysAfterYears / 30);
      const days = remainingDaysAfterYears % 30;
      
      return {
        years,
        months,
        days,
        totalDays,
        isMatured: true
      };
    } else {
      // For active policies, calculate time until maturity
      const years = Math.floor(totalDays / 365);
      const remainingDaysAfterYears = totalDays % 365;
      const months = Math.floor(remainingDaysAfterYears / 30);
      const days = remainingDaysAfterYears % 30;
      
      return {
        years,
        months,
        days,
        totalDays,
        isMatured: false
      };
    }
  }
  
  getFormattedMaturityPeriod(policy: EnhancedClientPolicy): string {
    const maturityPeriod = this.calculateMaturityPeriod(policy.endDate);
    
    if (maturityPeriod.isMatured) {
      if (maturityPeriod.years > 0) {
        return `Matured ${maturityPeriod.years}y ${maturityPeriod.months}m ago`;
      } else if (maturityPeriod.months > 0) {
        return `Matured ${maturityPeriod.months}m ${maturityPeriod.days}d ago`;
      } else {
        return `Matured ${maturityPeriod.days}d ago`;
      }
    } else {
      if (maturityPeriod.years > 0) {
        return `${maturityPeriod.years}y ${maturityPeriod.months}m ${maturityPeriod.days}d`;
      } else if (maturityPeriod.months > 0) {
        return `${maturityPeriod.months}m ${maturityPeriod.days}d`;
      } else {
        return `${maturityPeriod.days}d`;
      }
    }
  }
  
  getDaysUntilMaturity(policy: EnhancedClientPolicy): number | null {
    return policy.daysUntilExpiry ?? this.calculateDaysUntilMaturity(policy.endDate);
  }
  
  isPolicyMatured(policy: EnhancedClientPolicy): boolean {
    const today = new Date();
    const endDate = new Date(policy.endDate);
    return endDate < today;
  }
  
  isPolicyMaturingSoon(policy: EnhancedClientPolicy): boolean {
    const today = new Date();
    const endDate = new Date(policy.endDate);
    const timeDiff = endDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= 30 && daysDiff >= 0;
  }
  
  // ============================================
  // POLICY STATUS UPDATES
  // ============================================
  
  private updateMaturedPoliciesStatus(): void {
    const today = new Date();
    let updatedPolicies: string[] = [];
    
    this.clientPolicies.forEach(policy => {
      const endDate = new Date(policy.endDate);
      const daysUntilMaturity = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      // Update days until maturity (keeping the same property name for backend compatibility)
      policy.daysUntilExpiry = daysUntilMaturity;
      
      // Auto-update status to expired if past end date (using "Expired" to maintain backend compatibility)
      if (daysUntilMaturity < 0 && policy.status !== 'Expired') {
        policy.status = 'Expired';
        updatedPolicies.push(policy.policyId);
        
        // Update in backend
        const updateRequest: UpdateClientPolicyRequest = {
          policyId: policy.policyId,
          status: 'Expired'
        };
        
        this.policyService.updateClientPolicy(policy.policyId, updateRequest)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Status updated successfully
            },
            error: (error) => {
              this.showToast(`Error updating policy status: ${error.message}`, 'error');
            }
          });
      }
    });
    
    if (updatedPolicies.length > 0) {
      this.showToast(`${updatedPolicies.length} policies automatically marked as matured`, 'info');
    }
  }
  
  // ============================================
  // UTILITY HELPER METHODS
  // ============================================
  
  getPolicyStatusColor(policy: EnhancedClientPolicy): string {
    if (this.isPolicyMatured(policy)) {
      return 'danger';
    } else if (this.isPolicyMaturingSoon(policy)) {
      return 'warning';
    } else if (policy.status === 'Active') {
      return 'success';
    } else {
      return 'secondary';
    }
  }
  
  // ============================================
  // CATALOG AUTOCOMPLETE METHODS
  // ============================================
  
  onCatalogPolicyNameSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value;
    this.catalogPolicyNameSearchTerm = searchTerm;
    
    if (searchTerm.length < 2) {
      this.catalogPolicyNameSuggestions = [];
      return;
    }
    
    // Search in existing catalog for similar policy names
    this.autocompleteService.getPolicyCatalog({
      agentId: this.currentAgentId,
      searchTerm: searchTerm
    }).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.catalogPolicyNameSuggestions = [];
        return of([]);
      })
    ).subscribe((suggestions) => {
      this.catalogPolicyNameSuggestions = suggestions;
    });
  }
  
  selectCatalogPolicyName(suggestion: PolicyCatalogItem): void {
    this.catalogForm.patchValue({ policyName: suggestion.policyName });
    this.catalogPolicyNameSuggestions = [];
    this.catalogPolicyNameSearchTerm = suggestion.policyName;
  }
  
  // ============================================
  // POLICY HISTORY
  // ============================================
  
  loadPolicyHistory(clientId: string): void {
    this.selectedClientForHistory = clientId;
    this.showHistoryModal = true;
    
    this.policyService.getPolicyHistory({ 
      clientId, 
      includeInactive: true 
    }).pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        this.showToast('Error loading policy history: ' + error.message, 'error');
        return of([]);
      })
    ).subscribe((history) => {
      this.policyHistory = history;
    });
  }
  
  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.selectedClientForHistory = null;
    this.policyHistory = [];
  }
  
  // ============================================
  // CLIENT SEARCH METHODS
  // ============================================
  
  onClientSearch(term: string): void {
    this.clientSearchTerm = term;
    if (term.length < 2) {
      this.clientSearchResults = [];
      return;
    }
    
    this.clientsService.search(this.currentAgentId, term)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.clientSearchResults = [];
          this.showToast('Error searching clients: ' + error.message, 'error');
          return of([]);
        })
      )
      .subscribe((clients) => {
        this.clientSearchResults = clients.map(client => ({
          ClientId: client.ClientId,
          FirstName: client.FirstName,
          Surname: client.Surname,
          LastName: client.LastName,
          Email: client.Email,
          PhoneNumber: client.PhoneNumber
        }));
      });
  }
  
  selectClient(client: Client): void {
    this.clientSearchTerm = `${client.FirstName} ${client.Surname}`.trim();
    this.selectedClientId = client.ClientId;
    this.clientPolicyForm.patchValue({ clientId: client.ClientId });
    this.clientSearchResults = [];
  }
  
  // ============================================
  // POLICY NAME DROPDOWN METHODS
  // ============================================
  
  onPolicySelect(event: Event): void {
    const policyId = (event.target as HTMLSelectElement).value;
    this.clientPolicyForm.patchValue({ policyId });
  }
  
  getPolicyNameById(policyId: string): string {
    const policy = this.policyDropdownOptions.find(p => p.policyId === policyId);
    return policy ? policy.policyName : '';
  }
  
  // ============================================
  // CLIENT POLICY OPERATIONS
  // ============================================
  
  openClientPolicyModal(policy?: EnhancedClientPolicy): void {
    this.editingPolicy = policy || null;
    this.clientSearchTerm = '';
    this.clientSearchResults = [];
    
    if (policy) {
      // Edit mode
      this.clientPolicyForm.patchValue({
        clientId: policy.clientId,
        policyId: policy.policyId, 
        status: policy.status,
        startDate: this.formatDateForInput(new Date(policy.startDate)),
        endDate: this.formatDateForInput(new Date(policy.endDate)),
        notes: policy.notes || ''
      });
      
      // Set client search term for display
      this.clientSearchTerm = policy.clientName || policy.clientId;
      this.selectedClientId = policy.clientId;
    } else {
      // Create mode
      this.clientPolicyForm.reset();
      this.clientPolicyForm.patchValue({
        status: 'Active'
      });
      this.selectedClientId = '';
    }
    
    this.showClientPolicyModal = true;
  }
  
  closeClientPolicyModal(): void {
    this.showClientPolicyModal = false;
    this.editingPolicy = null;
    this.clientPolicyForm.reset();
    this.clientSearchTerm = '';
    this.clientSearchResults = [];
  }
  
  onSubmitClientPolicy(): void {
    if (this.clientPolicyForm.invalid) {
      this.markFormGroupTouched(this.clientPolicyForm);
      return;
    }
    
    // Check for date range validation error
    if (this.clientPolicyForm.errors?.['dateRangeInvalid']) {
      this.showToast(this.clientPolicyForm.errors['dateRangeInvalid'].message, 'error');
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.clientPolicyForm.value;
    
    // Get the policy name from the selected policy ID
    const selectedPolicy = this.policyDropdownOptions.find(p => p.policyId === formValue.policyId);
    const policyName = selectedPolicy ? selectedPolicy.policyName : '';
    
    if (this.editingPolicy) {
      // Update
      const request: UpdateClientPolicyRequest = {
        policyId: this.editingPolicy.policyId,
        policyName: policyName,
        status: formValue.status,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        notes: formValue.notes,
        policyCatalogId: formValue.policyId
      };
      
      this.policyService.updateClientPolicy(this.editingPolicy.policyId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeClientPolicyModal();
            this.loadInitialData();
            this.showToast(`Policy "${policyName}" updated successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error updating policy: ' + error.message, 'error');
          }
        });
    } else {
      // Create
      const request: CreateClientPolicyRequest = {
        clientId: formValue.clientId,
        policyName: policyName,
        status: formValue.status,
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        notes: formValue.notes,
        policyCatalogId: formValue.policyId
      };
      
      this.policyService.createClientPolicy(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeClientPolicyModal();
            this.loadInitialData();
            this.showToast(`Policy "${policyName}" created successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error creating policy: ' + error.message, 'error');
          }
        });
    }
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
  
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
  
  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }
  
  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    
    // Check for form-level date range validation
    if (form.errors?.['dateRangeInvalid'] && 
        (fieldName === 'startDate' || fieldName === 'endDate')) {
      return form.errors['dateRangeInvalid'].message;
    }
    
    return '';
  }
  
  private getFieldDisplayName(fieldName: string): string {
    const fieldNameMap: { [key: string]: string } = {
      'clientId': 'Client',
      'policyId': 'Policy',
      'startDate': 'Start Date',
      'endDate': 'End Date',
      'templateName': 'Template Name',
      'companyName': 'Company Name',
      'typeName': 'Type Name',
      'categoryName': 'Category Name'
    };
    return fieldNameMap[fieldName] || fieldName;
  }
  
  // ============================================
  // SEARCH AND FILTERING
  // ============================================
  
  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.searchTerms$.next(term);
  }
  
  onFilterChange(): void {
    this.applyFilters();
  }
  
  private applyFilters(): void {
    let filtered = [...this.clientPolicies];
    
    // Apply search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(policy =>
        policy.policyName.toLowerCase().includes(term) ||
        policy.status.toLowerCase().includes(term) ||
        policy.companyName?.toLowerCase().includes(term) ||
        policy.typeName?.toLowerCase().includes(term) ||
        policy.clientName?.toLowerCase().includes(term) ||
        policy.clientEmail?.toLowerCase().includes(term) ||
        policy.notes?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(policy => policy.status === this.selectedStatus);
    }
    
    // Apply company filter
    if (this.selectedCompany) {
      filtered = filtered.filter(policy => policy.companyId === this.selectedCompany);
    }
    
    // Apply type filter
    if (this.selectedType) {
      filtered = filtered.filter(policy => policy.typeId === this.selectedType);
    }
    
    this.filteredPolicies = filtered;
    
    // Apply same logic to catalog
    let filteredCatalog = [...this.policyCatalog];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filteredCatalog = filteredCatalog.filter(item =>
        item.policyName.toLowerCase().includes(term) ||
        item.companyName?.toLowerCase().includes(term)
      );
    }
    this.filteredCatalog = filteredCatalog;
  }
  
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedCompany = '';
    this.selectedType = '';
    this.searchTerms$.next('');
  }
  
  // ============================================
  // REFRESH DATA
  // ============================================
  
  refreshData(): void {
    this.loadInitialData();
    this.loadAutocompleteData();
    this.loadPolicyDropdownOptions();
    this.showToast('Data refreshed successfully', 'success');
  }
  
  // ============================================
  // EXPORT FUNCTIONALITY
  // ============================================
  
  exportPolicies(format: 'json' | 'csv' = 'csv'): void {
    const safeData = this.filteredPolicies.map(policy => ({
      clientName: policy.clientName || 'Unknown Client',
      policyName: policy.policyName,
      companyName: policy.companyName || 'N/A',
      typeName: policy.typeName || 'N/A',
      status: policy.status,
      startDate: this.formatDateForExport(new Date(policy.startDate)),
      endDate: this.formatDateForExport(new Date(policy.endDate)),
      daysUntilMaturity: this.getDaysUntilMaturity(policy) || 0,
      maturityPeriod: this.getFormattedMaturityPeriod(policy),
      notes: policy.notes || ''
    }));
    
    const dataToExport = format === 'csv' 
      ? this.convertToCSV(safeData) 
      : JSON.stringify(safeData, null, 2);
    
    this.downloadFile(dataToExport, format);
    this.showToast(`${safeData.length} policies exported successfully as ${format.toUpperCase()}`, 'success');
  }
  
  private formatDateForExport(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB');
  }
  
  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  
  showToast(message: string, type: ToastType = 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    
    // Auto-hide after 5 seconds
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = window.setTimeout(() => {
      this.hideToast();
    }, 5000);
  }
  
  hideToast(): void {
    this.toastMessage = '';
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }
  
  // ============================================
  // CONFIRMATION MODAL
  // ============================================
  
  showConfirmation(action: ConfirmationAction): void {
    this.confirmationTitle = action.title;
    this.confirmationMessage = action.message;
    this.confirmationActionText = action.actionText;
    this.confirmationActionClass = action.actionClass;
    this.confirmationCallback = action.callback;
    this.showConfirmationModal = true;
  }
  
  closeConfirmationModal(): void {
    this.showConfirmationModal = false;
    this.confirmationCallback = undefined;
  }
  
  executeConfirmationAction(): void {
    if (this.confirmationCallback) {
      this.confirmationCallback();
    }
    this.closeConfirmationModal();
  }
  
  // ============================================
  // POLICY DELETION AND RENEWAL
  // ============================================
  
  confirmDeletePolicy(policy: EnhancedClientPolicy): void {
    const clientName = policy.clientName || 'Unknown Client';
    this.showConfirmation({
      title: 'Confirm Policy Deletion',
      message: `Are you sure you want to delete "${policy.policyName}" for ${clientName}? This action cannot be undone.`,
      actionText: 'Delete Policy',
      actionClass: 'btn-danger',
      callback: () => this.deleteClientPolicy(policy)
    });
  }
  
  deleteClientPolicy(policy: EnhancedClientPolicy): void {
    this.isSubmitting = true;
    this.policyService.softDeleteClientPolicy(policy.policyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.loadInitialData();
          this.showToast(`Policy "${policy.policyName}" deleted successfully`, 'success');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showToast('Error deleting policy: ' + error.message, 'error');
        }
      });
  }
  
  renewPolicy(policy: EnhancedClientPolicy): void {
    const clientName = policy.clientName || 'Unknown Client';
    this.showConfirmation({
      title: 'Confirm Policy Renewal',
      message: `Are you sure you want to renew "${policy.policyName}" for ${clientName}? This will create a new policy starting from the current end date.`,
      actionText: 'Renew Policy',
      actionClass: 'btn-success',
      callback: () => this.executeRenewal(policy)
    });
  }
  
 
  private executeRenewal(policy: EnhancedClientPolicy): void {
    this.isSubmitting = true;
    const newStartDate = new Date(policy.endDate);
    const newEndDate = new Date(newStartDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    
    const renewalRequest: PolicyRenewalRequest = {
      policyId: policy.policyId,
      newStartDate: newStartDate.toISOString(),
      newEndDate: newEndDate.toISOString(),
      newPolicyName: `${policy.policyName} - Renewed`,
      notes: `Renewed from policy ${policy.policyId}`
    };
    
    this.policyService.renewPolicy(policy.policyId, renewalRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.loadInitialData();
          const clientName = policy.clientName || 'Unknown Client';
          this.showToast(`Policy "${policy.policyName}" renewed successfully for ${clientName}`, 'success');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showToast('Error renewing policy: ' + error.message, 'error');
        }
      });
  }
  
  // ============================================
  // BULK OPERATIONS
  // ============================================
  
  togglePolicySelection(policyId: string): void {
    const index = this.selectedPolicyIds.indexOf(policyId);
    if (index > -1) {
      this.selectedPolicyIds.splice(index, 1);
    } else {
      this.selectedPolicyIds.push(policyId);
    }
  }
  
  selectAllPolicies(): void {
    if (this.selectedPolicyIds.length === this.filteredPolicies.length) {
      this.selectedPolicyIds = [];
    } else {
      this.selectedPolicyIds = this.filteredPolicies.map(p => p.policyId);
    }
  }
  
  bulkActivatePolicies(): void {
    if (this.selectedPolicyIds.length === 0) {
      this.showToast('Please select policies to activate', 'warning');
      return;
    }
    
    const selectedPolicies = this.filteredPolicies.filter(p => this.selectedPolicyIds.includes(p.policyId));
    const policyNames = selectedPolicies.map(p => p.policyName).join(', ');
    
    this.showConfirmation({
      title: 'Confirm Bulk Activation',
      message: `Are you sure you want to activate ${this.selectedPolicyIds.length} policies? (${policyNames})`,
      actionText: 'Activate Policies',
      actionClass: 'btn-success',
      callback: () => this.executeBulkActivation()
    });
  }
  
  private executeBulkActivation(): void {
    this.isSubmitting = true;
    this.policyService.bulkActivatePolicies(this.selectedPolicyIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          const count = this.selectedPolicyIds.length;
          this.selectedPolicyIds = [];
          this.loadInitialData();
          this.showToast(`${count} policies activated successfully`, 'success');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showToast('Error activating policies: ' + error.message, 'error');
        }
      });
  }
  
  bulkDeactivatePolicies(): void {
    if (this.selectedPolicyIds.length === 0) {
      this.showToast('Please select policies to deactivate', 'warning');
      return;
    }
    
    const selectedPolicies = this.filteredPolicies.filter(p => this.selectedPolicyIds.includes(p.policyId));
    const policyNames = selectedPolicies.map(p => p.policyName).join(', ');
    
    this.showConfirmation({
      title: 'Confirm Bulk Deactivation',
      message: `Are you sure you want to deactivate ${this.selectedPolicyIds.length} policies? (${policyNames})`,
      actionText: 'Deactivate Policies',
      actionClass: 'btn-warning',
      callback: () => this.executeBulkDeactivation()
    });
  }
  
  private executeBulkDeactivation(): void {
    this.isSubmitting = true;
    this.policyService.bulkDeactivatePolicies(this.selectedPolicyIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          const count = this.selectedPolicyIds.length;
          this.selectedPolicyIds = [];
          this.loadInitialData();
          this.showToast(`${count} policies deactivated successfully`, 'success');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showToast('Error deactivating policies: ' + error.message, 'error');
        }
      });
  }
  
  // ============================================
  // CSV EXPORT UTILITY
  // ============================================
  
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
  
  private downloadFile(data: string, format: 'json' | 'csv'): void {
    const blob = new Blob([data], { 
      type: format === 'csv' ? 'text/csv' : 'application/json' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `policies_${timestamp}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
  
  // ============================================
  // TAB NAVIGATION
  // ============================================
  
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    // Load specific data based on tab
    if (tab === 'catalog' && this.policyCatalog.length === 0) {
      this.loadInitialData();
    }
  }
  
  // ============================================
  // TRACKBY FUNCTIONS FOR PERFORMANCE
  // ============================================
  
  trackByPolicyId(index: number, policy: EnhancedClientPolicy): string {
    return policy.policyId;
  }
  
  trackByCatalogId(index: number, item: PolicyCatalog): string {
    return item.policyId;
  }
  
  trackByTemplateId(index: number, template: PolicyTemplateInterface): string {
    return template.templateId;
  }
  
  trackByCompanyId(index: number, company: InsuranceCompany): string {
    return company.companyId;
  }
  
  trackByTypeId(index: number, type: PolicyTypeInterface): string {
    return type.typeId;
  }
  
  trackByCategoryId(index: number, category: PolicyCategoryInterface): string {
    return category.categoryId;
  }
  
  // ============================================
  // CATALOG OPERATIONS
  // ============================================
  
  openCatalogModal(item?: PolicyCatalog): void {
    this.editingCatalogItem = item || null;
    this.catalogPolicyNameSuggestions = [];
    this.catalogPolicyNameSearchTerm = '';
    
    if (item) {
      this.catalogForm.patchValue({
        policyName: item.policyName,
        companyId: item.companyId,
        notes: item.notes || '',
        categoryId: item.categoryId || '',
        typeId: item.typeId || ''
      });
      this.catalogPolicyNameSearchTerm = item.policyName;
    } else {
      this.catalogForm.reset();
    }
    
    this.showCatalogModal = true;
  }
  
  closeCatalogModal(): void {
    this.showCatalogModal = false;
    this.editingCatalogItem = null;
    this.catalogForm.reset();
    this.catalogPolicyNameSuggestions = [];
    this.catalogPolicyNameSearchTerm = '';
  }
  
  onSubmitCatalog(): void {
    if (this.catalogForm.invalid) {
      this.markFormGroupTouched(this.catalogForm);
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.catalogForm.value;
    
    if (this.editingCatalogItem) {
      // Update
      this.policyService.updatePolicyCatalogItem(this.editingCatalogItem.policyId, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeCatalogModal();
            this.loadInitialData();
            this.loadPolicyDropdownOptions(); // Refresh dropdown options
            this.showToast(`Catalog item "${formValue.policyName}" updated successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error updating catalog item: ' + error.message, 'error');
          }
        });
    } else {
      // Create
      const request = {
        agentId: this.currentAgentId,
        ...formValue
      };
      
      this.policyService.createPolicyCatalogItem(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeCatalogModal();
            this.loadInitialData();
            this.loadPolicyDropdownOptions(); // Refresh dropdown options
            this.showToast(`Catalog item "${request.policyName}" created successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error creating catalog item: ' + error.message, 'error');
          }
        });
    }
  }
  
  confirmDeleteCatalogItem(item: PolicyCatalog): void {
    this.showConfirmation({
      title: 'Confirm Catalog Deletion',
      message: `Are you sure you want to delete "${item.policyName}" from the catalog? This action cannot be undone.`,
      actionText: 'Delete Item',
      actionClass: 'btn-danger',
      callback: () => this.deleteCatalogItem(item)
    });
  }
  
  deleteCatalogItem(item: PolicyCatalog): void {
    this.isSubmitting = true;
    this.policyService.softDeletePolicyCatalog(item.policyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.loadInitialData();
          this.loadPolicyDropdownOptions(); // Refresh dropdown options
          this.showToast(`Catalog item "${item.policyName}" deleted successfully`, 'success');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showToast('Error deleting catalog item: ' + error.message, 'error');
        }
      });
  }
  
  // ============================================
  // TEMPLATE OPERATIONS
  // ============================================
  
  openTemplateModal(template?: PolicyTemplateInterface): void {
    this.editingTemplate = template || null;
    
    if (template) {
      this.templateForm.patchValue({
        templateName: template.templateName,
        defaultTermMonths: template.defaultTermMonths || 12,
        defaultPremium: template.defaultPremium || 0,
        coverageDescription: template.coverageDescription || '',
        terms: template.terms || '',
        categoryId: template.categoryId || '',
        policyCatalogId: template.policyCatalogId || '',
        typeId: template.typeId || ''
      });
    } else {
      this.templateForm.reset();
      this.templateForm.patchValue({
        defaultTermMonths: 12,
        defaultPremium: 0
      });
    }
    
    this.showTemplateModal = true;
  }
  
  closeTemplateModal(): void {
    this.showTemplateModal = false;
    this.editingTemplate = null;
    this.templateForm.reset();
  }
  
  onSubmitTemplate(): void {
    if (this.templateForm.invalid) {
      this.markFormGroupTouched(this.templateForm);
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.templateForm.value;
    
    if (this.editingTemplate) {
      // Update
      this.policyService.updatePolicyTemplate(this.editingTemplate.templateId, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeTemplateModal();
            this.loadReferenceData();
            this.showToast(`Template "${formValue.templateName}" updated successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error updating template: ' + error.message, 'error');
          }
        });
    } else {
      // Create
      const request = {
        agentId: this.currentAgentId,
        ...formValue
      };
      
      this.policyService.createPolicyTemplate(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeTemplateModal();
            this.loadReferenceData();
            this.showToast(`Template "${request.templateName}" created successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error creating template: ' + error.message, 'error');
          }
        });
    }
  }
  
  confirmDeleteTemplate(template: PolicyTemplateInterface): void {
    this.showConfirmation({
      title: 'Confirm Template Deletion',
      message: `Are you sure you want to delete template "${template.templateName}"? This action cannot be undone.`,
      actionText: 'Delete Template',
      actionClass: 'btn-danger',
      callback: () => this.deleteTemplate(template)
    });
  }
  
  deleteTemplate(template: PolicyTemplateInterface): void {
    this.isSubmitting = true;
    this.policyService.softDeletePolicyTemplate(template.templateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.loadReferenceData();
          this.showToast(`Template "${template.templateName}" deleted successfully`, 'success');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showToast('Error deleting template: ' + error.message, 'error');
        }
      });
  }
  
  // ============================================
  // COMPANY OPERATIONS
  // ============================================
  
  openCompanyModal(company?: InsuranceCompany): void {
    this.editingCompany = company || null;
    
    if (company) {
      this.companyForm.patchValue({
        companyName: company.companyName
      });
    } else {
      this.companyForm.reset();
    }
    
    this.showCompanyModal = true;
  }
  
  closeCompanyModal(): void {
    this.showCompanyModal = false;
    this.editingCompany = null;
    this.companyForm.reset();
  }
  
  onSubmitCompany(): void {
    if (this.companyForm.invalid) {
      this.markFormGroupTouched(this.companyForm);
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.companyForm.value;
    
    if (this.editingCompany) {
      // Update
      this.policyService.updateInsuranceCompany(this.editingCompany.companyId, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeCompanyModal();
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showToast(`Company "${formValue.companyName}" updated successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error updating company: ' + error.message, 'error');
          }
        });
    } else {
      // Create
      this.policyService.createInsuranceCompany(formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeCompanyModal();
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showToast(`Company "${formValue.companyName}" created successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error creating company: ' + error.message, 'error');
          }
        });
    }
  }
  
  confirmDeleteCompany(company: InsuranceCompany): void {
    this.showConfirmation({
      title: 'Confirm Company Deletion',
      message: `Are you sure you want to delete "${company.companyName}"? This action cannot be undone.`,
      actionText: 'Delete Company',
      actionClass: 'btn-danger',
      callback: () => this.deleteCompany(company)
    });
  }
  
  deleteCompany(company: InsuranceCompany): void {
    this.isSubmitting = true;
    this.policyService.softDeleteInsuranceCompany(company.companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.loadReferenceData();
          this.loadAutocompleteData();
          this.showToast(`Company "${company.companyName}" deleted successfully`, 'success');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showToast('Error deleting company: ' + error.message, 'error');
        }
      });
  }
  
  // ============================================
  // TYPE OPERATIONS
  // ============================================
  
  openTypeModal(type?: PolicyTypeInterface): void {
    this.editingType = type || null;
    
    if (type) {
      this.typeForm.patchValue({
        typeName: type.typeName
      });
    } else {
      this.typeForm.reset();
    }
    
    this.showTypeModal = true;
  }
  
  closeTypeModal(): void {
    this.showTypeModal = false;
    this.editingType = null;
    this.typeForm.reset();
  }
  
  onSubmitType(): void {
    if (this.typeForm.invalid) {
      this.markFormGroupTouched(this.typeForm);
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.typeForm.value;
    
    if (this.editingType) {
      // Update
      this.policyService.updatePolicyType(this.editingType.typeId, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeTypeModal();
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showToast(`Policy type "${formValue.typeName}" updated successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error updating policy type: ' + error.message, 'error');
          }
        });
    } else {
      // Create
      this.policyService.createPolicyType(formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeTypeModal();
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showToast(`Policy type "${formValue.typeName}" created successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error creating policy type: ' + error.message, 'error');
          }
        });
    }
  }
  
  confirmDeleteType(type: PolicyTypeInterface): void {
    this.showConfirmation({
      title: 'Confirm Type Deletion',
      message: `Are you sure you want to delete policy type "${type.typeName}"? This action cannot be undone.`,
      actionText: 'Delete Type',
      actionClass: 'btn-danger',
      callback: () => this.deleteType(type)
    });
  }
  
  deleteType(type: PolicyTypeInterface): void {
    this.isSubmitting = true;
    this.policyService.softDeletePolicyType(type.typeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.loadReferenceData();
          this.loadAutocompleteData();
          this.showToast(`Policy type "${type.typeName}" deleted successfully`, 'success');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showToast('Error deleting policy type: ' + error.message, 'error');
        }
      });
  }
  // ============================================
  // CATEGORY OPERATIONS
  // ============================================
  
  openCategoryModal(category?: PolicyCategoryInterface): void {
    this.editingCategory = category || null;
    
    if (category) {
      this.categoryForm.patchValue({
        categoryName: category.categoryName,
        description: category.description || ''
      });
    } else {
      this.categoryForm.reset();
    }
    
    this.showCategoryModal = true;
  }
  
  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.editingCategory = null;
    this.categoryForm.reset();
  }
  
  onSubmitCategory(): void {
    if (this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.categoryForm.value;
    
    if (this.editingCategory) {
      // Update
      this.policyService.updatePolicyCategory(this.editingCategory.categoryId, formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeCategoryModal();
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showToast(`Category "${formValue.categoryName}" updated successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error updating category: ' + error.message, 'error');
          }
        });
    } else {
      // Create
      this.policyService.createPolicyCategory(formValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeCategoryModal();
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showToast(`Category "${formValue.categoryName}" created successfully`, 'success');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showToast('Error creating category: ' + error.message, 'error');
          }
        });
    }
  }
  
  confirmDeleteCategory(category: PolicyCategoryInterface): void {
    this.showConfirmation({
      title: 'Confirm Category Deletion',
      message: `Are you sure you want to delete category "${category.categoryName}"? This action cannot be undone.`,
      actionText: 'Delete Category',
      actionClass: 'btn-danger',
      callback: () => this.deleteCategory(category)
    });
  }
  
  deleteCategory(category: PolicyCategoryInterface): void {
    this.isSubmitting = true;
    this.policyService.softDeletePolicyCategory(category.categoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.loadReferenceData();
          this.loadAutocompleteData();
          this.showToast(`Category "${category.categoryName}" deleted successfully`, 'success');
        },
        error: (error) => {
          this.isSubmitting = false;
          this.showToast('Error deleting category: ' + error.message, 'error');
        }
      });
  }
}