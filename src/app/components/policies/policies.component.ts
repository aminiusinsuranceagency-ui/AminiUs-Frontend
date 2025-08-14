// policies.component.ts
import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';

// Import your services and interfaces
import { PolicyService } from '../../services/policies.service';
import { AutocompleteService, Company, PolicyType, PolicyCategory, PolicyCatalogItem, PolicyTemplate } from '../../services/autocomplete.service';
import { SessionService } from '../../services/session.service';
import { NavbarComponent } from '../navbar/navbar.component';

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
  PolicyStatus
} from '../../interfaces/policy';

@Component({
  selector: 'app-policies',
  standalone: true,
  templateUrl: './policies.component.html',
  styleUrls: ['./policies.component.css'],
  imports: [NavbarComponent, CommonModule, FormsModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
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
  
  // Data arrays
  clientPolicies: ClientPolicy[] = [];
  policyCatalog: PolicyCatalog[] = [];
  companies: InsuranceCompany[] = [];
  policyTypes: PolicyTypeInterface[] = [];
  policyCategories: PolicyCategoryInterface[] = [];
  policyTemplates: PolicyTemplateInterface[] = [];
  
  // Filtered data
  filteredPolicies: ClientPolicy[] = [];
  filteredCatalog: PolicyCatalog[] = [];
  
  // Dashboard data
  dashboardSummary: AgentDashboardSummary | null = null;
  
 
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
  
  // Edit states
  editingPolicy: ClientPolicy | null = null;
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
  
  // Policy statuses
  policyStatuses = Object.values(PolicyStatus);
  
  constructor(
    private policyService: PolicyService,
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
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  private initializeForms(): void {
    this.clientPolicyForm = this.fb.group({
      clientId: ['', Validators.required],
      policyName: ['', Validators.required],
      status: ['Active'],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      notes: [''],
      policyCatalogId: [''],
      typeId: [''],
      companyId: ['']
    });
    
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
    
    // Load dashboard summary
    this.policyService.getMyDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.dashboardSummary = summary;
        },
        error: (error) => console.error('Error loading dashboard:', error)
      });
    
    // Load all policies
    this.policyService.getMyPolicies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (policies) => {
          this.clientPolicies = policies;
          this.filteredPolicies = policies;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading policies:', error);
          this.isLoading = false;
        }
      });
    
    // Load catalog
    this.policyService.getMyCatalog()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (catalog) => {
          this.policyCatalog = catalog;
          this.filteredCatalog = catalog;
        },
        error: (error) => console.error('Error loading catalog:', error)
      });
    
    // Load reference data
    this.loadReferenceData();
  }
  
  private loadReferenceData(): void {
    // Load companies
    this.policyService.getInsuranceCompanies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (companies) => this.companies = companies,
        error: (error) => console.error('Error loading companies:', error)
      });
    
    // Load types
    this.policyService.getPolicyTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => this.policyTypes = types,
        error: (error) => console.error('Error loading types:', error)
      });
    
    // Load categories
    this.policyService.getPolicyCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => this.policyCategories = categories,
        error: (error) => console.error('Error loading categories:', error)
      });
    
    // Load templates
    this.policyService.getPolicyTemplates({ agentId: this.currentAgentId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => this.policyTemplates = templates,
        error: (error) => console.error('Error loading templates:', error)
      });
  }
  
  private loadAutocompleteData(): void {
    // Load autocomplete companies
    this.autocompleteService.getCompanies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (companies) => this.autocompleteCompanies = companies,
        error: (error) => console.error('Error loading autocomplete companies:', error)
      });
    
    // Load autocomplete types
    this.autocompleteService.getPolicyTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => this.autocompleteTypes = types,
        error: (error) => console.error('Error loading autocomplete types:', error)
      });
    
    // Load autocomplete categories
    this.autocompleteService.getPolicyCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => this.autocompleteCategories = categories,
        error: (error) => console.error('Error loading autocomplete categories:', error)
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
        policy.typeName?.toLowerCase().includes(term)
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
  // CLIENT POLICY OPERATIONS
  // ============================================
  
  openClientPolicyModal(policy?: ClientPolicy): void {
    this.editingPolicy = policy || null;
    
    if (policy) {
      // Edit mode
      this.clientPolicyForm.patchValue({
        clientId: policy.clientId,
        policyName: policy.policyName,
        status: policy.status,
        startDate: this.formatDateForInput(policy.startDate),
        endDate: this.formatDateForInput(policy.endDate),
        notes: policy.notes || '',
        policyCatalogId: policy.policyCatalogId || '',
        typeId: policy.typeId || '',
        companyId: policy.companyId || ''
      });
    } else {
      // Create mode
      this.clientPolicyForm.reset();
      this.clientPolicyForm.patchValue({
        status: 'Active'
      });
    }
    
    this.showClientPolicyModal = true;
  }
  
  closeClientPolicyModal(): void {
    this.showClientPolicyModal = false;
    this.editingPolicy = null;
    this.clientPolicyForm.reset();
  }
 

  
  onSubmitClientPolicy(): void {
    if (this.clientPolicyForm.invalid) {
      this.markFormGroupTouched(this.clientPolicyForm);
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.clientPolicyForm.value;
    
    if (this.editingPolicy) {
      // Update
      const request: UpdateClientPolicyRequest = {
        policyId: this.editingPolicy.policyId,
        ...formValue
      };
      
      this.policyService.updateClientPolicy(this.editingPolicy.policyId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeClientPolicyModal();
            this.loadInitialData();
            this.showSuccessMessage('Policy updated successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error updating policy: ' + error.message);
          }
        });
    } else {
      // Create
      const request: CreateClientPolicyRequest = formValue;
      
      this.policyService.createClientPolicy(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeClientPolicyModal();
            this.loadInitialData();
            this.showSuccessMessage('Policy created successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error creating policy: ' + error.message);
          }
        });
    }
  }
  
  deleteClientPolicy(policy: ClientPolicy): void {
    if (confirm(`Are you sure you want to delete the policy "${policy.policyName}"?`)) {
      this.policyService.softDeleteClientPolicy(policy.policyId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadInitialData();
            this.showSuccessMessage('Policy deleted successfully');
          },
          error: (error) => {
            this.showErrorMessage('Error deleting policy: ' + error.message);
          }
        });
    }
  }
  
  // ============================================
  // CATALOG OPERATIONS
  // ============================================
  
  openCatalogModal(item?: PolicyCatalog): void {
    this.editingCatalogItem = item || null;
    
    if (item) {
      this.catalogForm.patchValue({
        policyName: item.policyName,
        companyId: item.companyId,
        notes: item.notes || '',
        categoryId: item.categoryId || '',
        typeId: item.typeId || ''
      });
    } else {
      this.catalogForm.reset();
    }
    
    this.showCatalogModal = true;
  }
  
  closeCatalogModal(): void {
    this.showCatalogModal = false;
    this.editingCatalogItem = null;
    this.catalogForm.reset();
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
            this.showSuccessMessage('Catalog item updated successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error updating catalog item: ' + error.message);
          }
        });
    } else {
      // Create
      const request: CreatePolicyCatalogRequest = {
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
            this.showSuccessMessage('Catalog item created successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error creating catalog item: ' + error.message);
          }
        });
    }
  }
  
  deleteCatalogItem(item: PolicyCatalog): void {
    if (confirm(`Are you sure you want to delete "${item.policyName}" from the catalog?`)) {
      this.policyService.softDeletePolicyCatalog(item.policyId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadInitialData();
            this.showSuccessMessage('Catalog item deleted successfully');
          },
          error: (error) => {
            this.showErrorMessage('Error deleting catalog item: ' + error.message);
          }
        });
    }
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
            this.showSuccessMessage('Template updated successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error updating template: ' + error.message);
          }
        });
    } else {
      // Create
      const request: CreatePolicyTemplateRequest = {
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
            this.showSuccessMessage('Template created successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error creating template: ' + error.message);
          }
        });
    }
  }
  
  deleteTemplate(template: PolicyTemplateInterface): void {
    if (confirm(`Are you sure you want to delete the template "${template.templateName}"?`)) {
      this.policyService.softDeletePolicyTemplate(template.templateId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadReferenceData();
            this.showSuccessMessage('Template deleted successfully');
          },
          error: (error) => {
            this.showErrorMessage('Error deleting template: ' + error.message);
          }
        });
    }
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
            this.showSuccessMessage('Company updated successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error updating company: ' + error.message);
          }
        });
    } else {
      // Create
      const request: CreateInsuranceCompanyRequest = formValue;
      
      this.policyService.createInsuranceCompany(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeCompanyModal();
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showSuccessMessage('Company created successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error creating company: ' + error.message);
          }
        });
    }
  }
  
  deleteCompany(company: InsuranceCompany): void {
    if (confirm(`Are you sure you want to delete "${company.companyName}"?`)) {
      this.policyService.softDeleteInsuranceCompany(company.companyId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showSuccessMessage('Company deleted successfully');
          },
          error: (error) => {
            this.showErrorMessage('Error deleting company: ' + error.message);
          }
        });
    }
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
            this.showSuccessMessage('Policy type updated successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error updating policy type: ' + error.message);
          }
        });
    } else {
      // Create
      const request: CreatePolicyTypeRequest = formValue;
      
      this.policyService.createPolicyType(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeTypeModal();
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showSuccessMessage('Policy type created successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error creating policy type: ' + error.message);
          }
        });
    }
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
            this.showSuccessMessage('Category updated successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error updating category: ' + error.message);
          }
        });
    } else {
      // Create
      const request: CreatePolicyCategoryRequest = formValue;
      
      this.policyService.createPolicyCategory(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.closeCategoryModal();
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showSuccessMessage('Category created successfully');
          },
          error: (error) => {
            this.isSubmitting = false;
            this.showErrorMessage('Error creating category: ' + error.message);
          }
        });
    }
  }
  
  deleteCategory(category: PolicyCategoryInterface): void {
    if (confirm(`Are you sure you want to delete the category "${category.categoryName}"?`)) {
      this.policyService.softDeletePolicyCategory(category.categoryId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadReferenceData();
            this.loadAutocompleteData();
            this.showSuccessMessage('Category deleted successfully');
          },
          error: (error) => {
            this.showErrorMessage('Error deleting category: ' + error.message);
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
        return `${fieldName} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }
  
  getPolicyStatusColor(policy: ClientPolicy): string {
    return this.policyService.getPolicyStatusColor(policy);
  }
  
  isPolicyExpired(policy: ClientPolicy): boolean {
    return this.policyService.isPolicyExpired(policy);
  }
  
  isPolicyExpiringSoon(policy: ClientPolicy): boolean {
    return this.policyService.isPolicyExpiringSoon(policy);
  }
  
  getDaysUntilExpiry(policy: ClientPolicy): number | null {
    return this.policyService.getDaysUntilExpiry(policy);
  }
  
  private showSuccessMessage(message: string): void {
    // You can implement a toast/notification service here
    console.log('Success:', message);
    alert(message); // Temporary - replace with proper notification
  }
  
  private showErrorMessage(message: string): void {
    // You can implement a toast/notification service here
    console.error('Error:', message);
    alert(message); // Temporary - replace with proper notification
  }
  
  // ============================================
  // BULK OPERATIONS
  // ============================================
  
  selectedPolicyIds: string[] = [];
  
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
      this.showErrorMessage('Please select policies to activate');
      return;
    }
    
    this.policyService.bulkActivatePolicies(this.selectedPolicyIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedPolicyIds = [];
          this.loadInitialData();
          this.showSuccessMessage('Policies activated successfully');
        },
        error: (error) => {
          this.showErrorMessage('Error activating policies: ' + error.message);
        }
      });
  }
  
  bulkDeactivatePolicies(): void {
    if (this.selectedPolicyIds.length === 0) {
      this.showErrorMessage('Please select policies to deactivate');
      return;
    }
    
    this.policyService.bulkDeactivatePolicies(this.selectedPolicyIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedPolicyIds = [];
          this.loadInitialData();
          this.showSuccessMessage('Policies deactivated successfully');
        },
        error: (error) => {
          this.showErrorMessage('Error deactivating policies: ' + error.message);
        }
      });
  }
  
  // ============================================
  // EXPORT FUNCTIONALITY
  // ============================================
  
  exportPolicies(format: 'json' | 'csv' = 'json'): void {
    // Note: Uncomment this when export method is available in service
    // this.policyService.exportPolicies(format, this.currentAgentId)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (data) => {
    //       this.downloadFile(data, format);
    //       this.showSuccessMessage('Export completed successfully');
    //     },
    //     error: (error) => {
    //       this.showErrorMessage('Error exporting policies: ' + error.message);
    //     }
    //   });
    
    // Temporary implementation
    const dataToExport = format === 'csv' ? this.convertToCSV(this.filteredPolicies) : JSON.stringify(this.filteredPolicies, null, 2);
    this.downloadFile(dataToExport, format);
  }
  
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
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
    link.download = `policies.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
  
  // ============================================
  // POLICY RENEWAL
  // ============================================
  
  renewPolicy(policy: ClientPolicy): void {
    const newStartDate = new Date(policy.endDate);
    const newEndDate = new Date(newStartDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    
    const renewalRequest = {
      newStartDate: newStartDate.toISOString(),
      newEndDate: newEndDate.toISOString(),
      newPolicyName: `${policy.policyName} - Renewed`,
      notes: `Renewed from policy ${policy.policyId}`
    };
    
    this.policyService.renewPolicy(policy.policyId, renewalRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadInitialData();
          this.showSuccessMessage('Policy renewed successfully');
        },
        error: (error) => {
          this.showErrorMessage('Error renewing policy: ' + error.message);
        }
      });
  }
  
  // ============================================
  // AUTOCOMPLETE HELPERS
  // ============================================
  
  onCompanySelect(event: Event, formGroup: FormGroup): void {
  const companyId = (event.target as HTMLSelectElement)?.value || '';
  formGroup.patchValue({ companyId });

  this.autocompleteService.getPolicyCatalog({
    agentId: this.currentAgentId,
    companyId
  }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (catalog) => this.autocompleteCatalog = catalog,
      error: (error) => console.error('Error loading catalog for company:', error)
    });
}

onTypeSelect(event: Event, formGroup: FormGroup): void {
  const typeId = (event.target as HTMLSelectElement)?.value || '';
  formGroup.patchValue({ typeId });
}

  
  onCategorySelect(categoryId: string, formGroup: FormGroup): void {
    formGroup.patchValue({ categoryId });
  }
  
  // ============================================
  // REFRESH DATA
  // ============================================
  
  refreshData(): void {
    this.loadInitialData();
    this.loadAutocompleteData();
    this.showSuccessMessage('Data refreshed successfully');
  }
}