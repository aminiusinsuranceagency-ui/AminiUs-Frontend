// interfaces/policy.ts - Updated Frontend Interfaces

// ============================================
// BASE ENTITY INTERFACES
// ============================================

export interface PolicyCatalog {
  policyId: string;
  agentId: string;
  policyName: string;
  companyId: string;
  companyName?: string;
  notes?: string;
  isActive: boolean;
  createdDate: Date;
  modifiedDate?: Date;
  categoryId?: string;
  categoryName?: string;
  typeId?: string;
  typeName?: string;
}

export interface ClientPolicy {
  clientName: string;
  policyId: string;
  clientId: string;
  policyName: string;
  status: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  createdDate: Date;
  modifiedDate?: Date;
  isActive: boolean;
  policyCatalogId?: string;
  catalogPolicyName?: string;
  typeId?: string;
  typeName?: string;
  companyId?: string;
  companyName?: string;
  daysUntilExpiry?: number;
}

export interface PolicyTemplate {
  templateId: string;
  agentId: string;
  templateName: string;
  defaultTermMonths?: number;
  defaultPremium?: number;
  coverageDescription?: string;
  terms?: string;
  isActive: boolean;
  createdDate: Date;
  categoryId?: string;
  categoryName?: string;
  policyCatalogId?: string;
  catalogPolicyName?: string;
  typeId?: string;
  typeName?: string;
}

export interface PolicyCategory {
  categoryId: string;
  categoryName: string;
  description?: string;
  isActive: boolean;
  createdDate: Date;
}

export interface InsuranceCompany {
  companyId: string;
  companyName: string;
  isActive: boolean;
  createdDate: Date;
}

export interface PolicyType {
  typeId: string;
  typeName: string;
  isActive: boolean;
  createdDate: Date;
}

// ============================================
// STATISTICS AND ANALYTICS INTERFACES
// ============================================

export interface PolicyStatistics {
  totalPolicies: number;
  activePolicies: number;
  expiredPolicies: number;
  cancelledPolicies: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
}

export interface PolicyStatisticsDetailed {
  groupType: string;
  groupName: string;
  policyCount: number;
  activeCount: number;
}

export interface AgentDashboardSummary {
  totalPolicies: number;
  activePolicies: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
  totalCompanies: number;
  totalClients: number;
  inactivePolicies: number;
}

export interface PolicyRenewalCandidate {
  policyId: string;
  clientId: string;
  policyName: string;
  status: string;
  startDate: Date;
  endDate: Date;
  companyId: string;
  companyName: string;
  typeId?: string;
  typeName?: string;
  daysUntilExpiry: number;
  renewalPriority: 'Urgent' | 'Soon' | 'Upcoming';
}

export interface PolicyHistory {
  policyId: string;
  clientId: string;
  policyName: string;
  status: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  createdDate: Date;
  modifiedDate?: Date;
  companyId: string;
  companyName: string;
  typeId?: string;
  typeName?: string;
  policyDurationDays: number;
  policyState: 'Current' | 'Expired' | string;
}

// ============================================
// FILTER REQUEST INTERFACES
// ============================================

export interface PolicyCatalogFilterRequest {
  agentId?: string;
  companyId?: string;
  categoryId?: string;
  typeId?: string;
  isActive?: boolean;
}

export interface ClientPolicyFilterRequest {
  clientId?: string;
  agentId?: string;
  status?: string;
  isActive?: boolean;
}

export interface PolicyTemplateFilterRequest {
  agentId?: string;
  categoryId?: string;
  typeId?: string;
  isActive?: boolean;
}

// ============================================
// CREATE REQUEST INTERFACES
// ============================================

export interface CreatePolicyCatalogRequest {
  agentId: string;
  policyName: string;
  companyId: string;
  notes?: string;
  categoryId?: string;
  typeId?: string;
}

export interface CreateClientPolicyRequest {
  clientId: string;
  policyName: string;   // from catalog
  status?: string;      // default: "Active"
  startDate: Date;
  endDate: Date;
  notes?: string;
  policyCatalogId: string;
}


export interface CreatePolicyTemplateRequest {
  agentId: string;
  templateName: string;
  defaultTermMonths?: number;
  defaultPremium?: number;
  coverageDescription?: string;
  terms?: string;
  categoryId?: string;
  policyCatalogId?: string;
  typeId?: string;
}

export interface CreatePolicyCategoryRequest {
  categoryName: string;
  description?: string;
}

export interface CreateInsuranceCompanyRequest {
  companyName: string;
}

export interface CreatePolicyTypeRequest {
  typeName: string;
}

// ============================================
// UPDATE REQUEST INTERFACES
// ============================================

export interface UpdatePolicyCatalogRequest {
  policyCatalogId: string;
  policyName?: string;
  companyId?: string;
  notes?: string;
  categoryId?: string;
  typeId?: string;
  isActive?: boolean;
}

export interface UpdateClientPolicyRequest {
  policyId: string;
  policyName?: string;
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  notes?: string;
  policyCatalogId?: string;
  typeId?: string;
  companyId?: string;
  isActive?: boolean;
}

export interface UpdatePolicyTemplateRequest {
  templateId: string;
  templateName?: string;
  defaultTermMonths?: number;
  defaultPremium?: number;
  coverageDescription?: string;
  terms?: string;
  categoryId?: string;
  policyCatalogId?: string;
  typeId?: string;
  isActive?: boolean;
}

export interface UpdatePolicyCategoryRequest {
  categoryId: string;
  categoryName?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateInsuranceCompanyRequest {
  companyId: string;
  companyName?: string;
  isActive?: boolean;
}

export interface UpdatePolicyTypeRequest {
  typeId: string;
  typeName?: string;
  isActive?: boolean;
}

// ============================================
// UPSERT REQUEST INTERFACES
// ============================================

export interface UpsertPolicyCatalogRequest {
  policyCatalogId?: string;
  agentId: string;
  policyName: string;
  companyId: string;
  notes?: string;
  categoryId?: string;
  typeId?: string;
}

export interface UpsertClientPolicyRequest {
  policyId?: string;
  clientId: string;
  policyName: string;
  status?: string;
  startDate: Date | string;
  endDate: Date | string;
  notes?: string;
  policyCatalogId?: string;
  typeId?: string;
  companyId?: string;
}

// ============================================
// SEARCH AND QUERY REQUEST INTERFACES
// ============================================

export interface SearchPoliciesRequest {
  searchTerm?: string;
  agentId?: string;
  clientId?: string;
  companyId?: string;
  typeId?: string;
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  pageSize?: number;
  pageNumber?: number;
}

export interface GetPoliciesByStatusRequest {
  status: string;
  agentId?: string;
}

export interface PolicyStatisticsRequest {
  agentId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface ExpiringPoliciesRequest {
  agentId?: string;
  daysAhead?: number;
  status?: string;
}

export interface GetPolicyHistoryRequest {
  clientId: string;
  includeInactive?: boolean;
}

export interface GetRenewalCandidatesRequest {
  agentId?: string;
  daysAhead?: number;
}

// ============================================
// POLICY OPERATIONS REQUEST INTERFACES
// ============================================

export interface PolicyRenewalRequest {
  policyId: string;
  newStartDate: Date | string;
  newEndDate: Date | string;
  newPolicyName?: string;
  notes?: string;
}

export interface BulkUpdatePolicyStatusRequest {
  policyIds: string[];
  newStatus: string;
}

export interface BatchExpirePoliciesRequest {
  asOfDate?: Date | string;
}

export interface PolicyValidationRequest {
  policyData: any; // Can be more specific based on validation needs
}

// ============================================
// UTILITY REQUEST INTERFACES
// ============================================

export interface CleanupSoftDeletedRequest {
  daysOld?: number;
  dryRun?: boolean;
}

export interface DeleteRequest {
  hardDelete?: boolean;
}

// ============================================
// RESPONSE INTERFACES
// ============================================

export interface PolicyResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  rowsAffected?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pageNumber: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CreateResponse {
  id: string;
}

export interface UpdateResponse {
  rowsAffected: number;
}

export interface DeleteResponse {
  rowsAffected: number;
}

export interface RenewalResponse {
  newPolicyId: string;
  rowsAffected: number;
}

export interface CleanupResponse {
  tableName?: string;
  recordsToDelete?: number;
  totalRecordsDeleted?: number;
}

export interface PolicyValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BulkOperationResponse {
  successCount: number;
  errorCount: number;
  errors?: string[];
}

export interface HealthCheckResponse {
  success: boolean;
  message: string;
  timestamp: string;
  status: 'OK' | 'ERROR';
  error?: string;
}

// ============================================
// UTILITY TYPES AND ENUMS
// ============================================

export enum PolicyStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  EXPIRED = 'Expired',
  CANCELLED = 'Cancelled',
  PENDING = 'Pending'
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv'
}

export enum RenewalPriority {
  URGENT = 'Urgent',
  SOON = 'Soon',
  UPCOMING = 'Upcoming'
}

export type PolicyStatusType = 'Active' | 'Inactive' | 'Expired' | 'Cancelled' | 'Pending';
export type ExportFormatType = 'json' | 'csv';
export type RenewalPriorityType = 'Urgent' | 'Soon' | 'Upcoming';

// ============================================
// FRONTEND-SPECIFIC INTERFACES
// ============================================

// Form interfaces for Angular reactive forms
export interface PolicyCatalogFormModel {
  policyName: string;
  companyId: string;
  notes?: string;
  categoryId?: string;
  typeId?: string;
}

export interface ClientPolicyFormModel {
  policyName: string;
  status?: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  policyCatalogId?: string;
  typeId?: string;
  companyId?: string;
}

export interface PolicyTemplateFormModel {
  templateName: string;
  defaultTermMonths?: number;
  defaultPremium?: number;
  coverageDescription?: string;
  terms?: string;
  categoryId?: string;
  policyCatalogId?: string;
  typeId?: string;
}

// Filter form interfaces
export interface PolicyFilterFormModel {
  agentId?: string;
  clientId?: string;
  companyId?: string;
  typeId?: string;
  categoryId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

// Search interfaces
export interface PolicySearchCriteria {
  searchTerm: string;
  filters: PolicyFilterFormModel;
  pageSize: number;
  pageNumber: number;
}

// UI State interfaces
export interface PolicyTableColumn {
  key: string;
  label: string;
  sortable: boolean;
  type: 'string' | 'date' | 'number' | 'status' | 'actions';
  width?: string;
}

export interface PolicyTableConfig {
  columns: PolicyTableColumn[];
  showActions: boolean;
  enableSorting: boolean;
  enableFiltering: boolean;
  pageSize: number;
}

// Notification interfaces
export interface PolicyNotification {
  id: string;
  type: 'renewal' | 'expiry' | 'warning' | 'info';
  title: string;
  message: string;
  policyId?: string;
  clientId?: string;
  createdAt: Date;
  isRead: boolean;
}

// Chart data interfaces for dashboard
export interface PolicyChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }[];
}

export interface PolicySummaryCard {
  title: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  color?: string;
}

// ============================================
// AUTOCOMPLETE INTERFACES
// ============================================

export interface AutocompleteOption {
  value: string;
  label: string;
  metadata?: any;
}

export interface PolicyAutocompleteOptions {
  companies: AutocompleteOption[];
  categories: AutocompleteOption[];
  types: AutocompleteOption[];
  templates: AutocompleteOption[];
  catalog: AutocompleteOption[];
}

// ============================================
// VALIDATION INTERFACES
// ============================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================
// SERVICE STATE INTERFACES
// ============================================

export interface PolicyServiceState {
  policies: ClientPolicy[];
  policyCatalog: PolicyCatalog[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// ============================================
// UTILITY HELPER INTERFACES
// ============================================

export interface PolicySortOptions {
  field: keyof ClientPolicy | keyof PolicyCatalog;
  direction: 'asc' | 'desc';
}

export interface PolicyExportOptions {
  format: ExportFormatType;
  fields: string[];
  filters?: PolicyFilterFormModel;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PolicyBulkAction {
  type: 'activate' | 'deactivate' | 'expire' | 'delete';
  policyIds: string[];
  options?: any;
}

// ============================================
// LEGACY COMPATIBILITY INTERFACES
// ============================================

// Keep for backward compatibility if needed
export interface PolicyCompanyRelationship {
  policyId: string;
  companyId: string;
  companyName: string;
}

// ============================================
// TYPE GUARDS AND UTILITY FUNCTIONS
// ============================================

// Type guard functions (can be used in service or components)
export const isPolicyExpired = (policy: ClientPolicy): boolean => {
  return new Date(policy.endDate) < new Date();
};

export const isPolicyExpiringSoon = (policy: ClientPolicy, daysThreshold = 30): boolean => {
  const today = new Date();
  const endDate = new Date(policy.endDate);
  const timeDiff = endDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff <= daysThreshold && daysDiff >= 0;
};

// Helper type for form controls
export type PolicyFormControl<T> = {
  [K in keyof T]: T[K] | null;
};

// Generic API response wrapper
export type ApiResponse<T = any> = PolicyResponse<T>;


