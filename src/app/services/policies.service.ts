import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SessionService } from './session.service';
// bbtn butl zocb bvue
// Import all the interfaces from your policy interfaces file
import {
  PolicyCatalog,
  ClientPolicy,
  PolicyTemplate,
  PolicyCategory,
  InsuranceCompany,
  PolicyType,
  PolicyStatistics,
  PolicyStatisticsDetailed,
  AgentDashboardSummary,
  PolicyRenewalCandidate,
  PolicyHistory,
  PolicyCatalogFilterRequest,
  ClientPolicyFilterRequest,
  CreateClientPolicyRequest,
  UpdateClientPolicyRequest,
  SearchPoliciesRequest,
  GetPoliciesByStatusRequest,
  PolicyStatisticsRequest,
  ExpiringPoliciesRequest,
  PolicyRenewalRequest,
  BulkUpdatePolicyStatusRequest,
  CreatePolicyCatalogRequest,
  UpdatePolicyCatalogRequest,
  UpsertPolicyCatalogRequest,
  UpsertClientPolicyRequest,
  CreatePolicyTemplateRequest,
  UpdatePolicyTemplateRequest,
  PolicyTemplateFilterRequest,
  CreateInsuranceCompanyRequest,
  UpdateInsuranceCompanyRequest,
  CreatePolicyTypeRequest,
  UpdatePolicyTypeRequest,
  CreatePolicyCategoryRequest,
  UpdatePolicyCategoryRequest,
  GetPolicyHistoryRequest,
  GetRenewalCandidatesRequest,
  BatchExpirePoliciesRequest,
  CleanupSoftDeletedRequest,
  PolicyValidationRequest,
  PolicyResponse,
  PaginatedResponse,
  CreateResponse,
  UpdateResponse,
  DeleteResponse,
  RenewalResponse,
  CleanupResponse,
  PolicyValidationResponse
} from '../interfaces/policy';
import { Client } from '../interfaces/client';
import { ClientWithPolicies, ClientWithPoliciesFilter } from '../interfaces/CLIENTS-POLICY';



@Injectable({
  providedIn: 'root'
})
export class PolicyService {

  private readonly baseUrl = 'https://aminius-backend.onrender.com/api/policies';
  private readonly autocompeteUrl = 'https://aminius-backend.onrender.com/api/policies/autocomplete';
  private readonly ApiUrl = 'https://aminius-backend.onrender.com/api/clients';
    
  // Reactive state subjects
  private policiesSubject = new BehaviorSubject<ClientPolicy[]>([]);
  private policyCatalogSubject = new BehaviorSubject<PolicyCatalog[]>([]);
    private clientsWithPoliciesSubject = new BehaviorSubject<ClientWithPolicies[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // Observable streams
  public policies$ = this.policiesSubject.asObservable();
  public policyCatalog$ = this.policyCatalogSubject.asObservable();
    public clientsWithPolicies$ = this.clientsWithPoliciesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private sessionService: SessionService
  ) {
    console.log('PolicyService initialized');
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private getHttpOptions(): { headers: HttpHeaders } {
    const token = this.sessionService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
    return { headers };
  }

  private buildHttpParams(params: any): HttpParams {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          httpParams = httpParams.set(key, value.join(','));
        } else if (value instanceof Date) {
          httpParams = httpParams.set(key, value.toISOString());
        } else {
          httpParams = httpParams.set(key, value.toString());
        }
      }
    });
    
    return httpParams;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('PolicyService error:', error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
 /** Get client by ID */
   getById(agentId: string, clientId: string): Observable<Client> {
     return this.http.get<Client>(`${this.ApiUrl}/${agentId}/${clientId}`);
   }
  // ============================================
  // HEALTH CHECK
  // ============================================

  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

/** 🔹 Get all clients with their assigned policies */
/** 🔹 Get all clients with their assigned policies */
public getClientsWithPolicies(filters?: ClientWithPoliciesFilter): Observable<ClientWithPolicies[]> {
  this.setLoading(true);
  const params = filters ? this.buildHttpParams(filters) : new HttpParams();

  return this.http.get<ClientWithPolicies[]>(`${this.baseUrl}/clients-with-policies`, {
    ...this.getHttpOptions(),
    params
  }).pipe(
    tap(clients => {
      console.log("Clients extracted from response:", clients);
      this.clientsWithPoliciesSubject.next(clients);
      this.setLoading(false);
    }),
    catchError(err => {
      this.setLoading(false);
      return this.handleError(err);
    })
  );
}


  // ============================================
  // POLICY CATALOG OPERATIONS
  // ============================================

  getPolicyCatalog(filters?: PolicyCatalogFilterRequest): Observable<PolicyCatalog[]> {
    this.setLoading(true);
    const params = filters ? this.buildHttpParams(filters) : new HttpParams();
    
    return this.http.get<PolicyResponse<PolicyCatalog[]>>(`${this.baseUrl}/catalog`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      tap(catalog => {
        this.policyCatalogSubject.next(catalog);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }
  // policy.service.ts

getPolicyNameDropDown(agentId: string): Observable<{ policyId: string; policyName: string }[]> {
  const params = new HttpParams().set('agentId', agentId);

  return this.http.get<PolicyResponse<PolicyCatalog[]>>(`${this.baseUrl}/catalog`, {
    ...this.getHttpOptions(),
    params
  }).pipe(
    // Map to only policyId + policyName for dropdown
    map(response => (response.data || []).map(item => ({
      policyId: item.policyId,
      policyName: item.policyName
    }))),
    catchError(this.handleError)
  );
}


  createPolicyCatalogItem(request: CreatePolicyCatalogRequest): Observable<CreateResponse> {
    return this.http.post<PolicyResponse<CreateResponse>>(`${this.baseUrl}/catalog`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshPolicyCatalog()),
        catchError(this.handleError)
      );
  }

  updatePolicyCatalogItem(id: string, request: Omit<UpdatePolicyCatalogRequest, 'policyCatalogId'>): Observable<UpdateResponse> {
    return this.http.put<PolicyResponse<UpdateResponse>>(`${this.baseUrl}/catalog/${id}`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshPolicyCatalog()),
        catchError(this.handleError)
      );
  }

  upsertPolicyCatalog(request: UpsertPolicyCatalogRequest): Observable<any> {
    return this.http.post<PolicyResponse<any>>(`${this.baseUrl}/catalog/upsert`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshPolicyCatalog()),
        catchError(this.handleError)
      );
  }

  softDeletePolicyCatalog(id: string): Observable<DeleteResponse> {
    return this.http.delete<PolicyResponse<DeleteResponse>>(`${this.baseUrl}/catalog/${id}/soft`, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshPolicyCatalog()),
        catchError(this.handleError)
      );
  }

  private refreshPolicyCatalog(): void {
    const agentId = this.sessionService.getAgentId();
    if (agentId) {
      this.getPolicyCatalog({ agentId }).subscribe();
    }
  }

  // ============================================
  // CLIENT POLICY OPERATIONS
  // ============================================

  getClientPolicies(filters?: ClientPolicyFilterRequest): Observable<ClientPolicy[]> {
    this.setLoading(true);
    const params = filters ? this.buildHttpParams(filters) : new HttpParams();
    
    return this.http.get<PolicyResponse<ClientPolicy[]>>(`${this.baseUrl}/policies`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      tap(policies => {
        this.policiesSubject.next(policies);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  getPolicyById(id: string): Observable<ClientPolicy> {
    return this.http.get<PolicyResponse<ClientPolicy>>(`${this.baseUrl}/policies/${id}`, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

 createClientPolicy(request: CreateClientPolicyRequest): Observable<CreateResponse> {
  console.log('[ClientPolicyService] Sending request to backend:', request);

  return this.http.post<PolicyResponse<CreateResponse>>(
      `${this.baseUrl}/policies`,
      request,
      this.getHttpOptions()
    ).pipe(
      tap(response => {
        console.log('[ClientPolicyService] Raw backend response:', response);
      }),
      map(response => {
        console.log('[ClientPolicyService] Extracted response.data:', response.data);
        return response.data!;
      }),
      tap(() => {
        console.log('[ClientPolicyService] Refreshing client policies...');
        this.refreshClientPolicies();
      }),
      catchError(err => {
        console.error('[ClientPolicyService] Error occurred while creating policy:', err);
        return this.handleError(err);
      })
    );
}

  updateClientPolicy(id: string, request: Omit<UpdateClientPolicyRequest, 'policyId'>): Observable<UpdateResponse> {
    return this.http.put<PolicyResponse<UpdateResponse>>(`${this.baseUrl}/policies/${id}`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshClientPolicies()),
        catchError(this.handleError)
      );
  }

  upsertClientPolicy(request: UpsertClientPolicyRequest): Observable<any> {
    return this.http.post<PolicyResponse<any>>(`${this.baseUrl}/policies/upsert`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshClientPolicies()),
        catchError(this.handleError)
      );
  }

  softDeleteClientPolicy(id: string): Observable<DeleteResponse> {
    return this.http.delete<PolicyResponse<DeleteResponse>>(`${this.baseUrl}/policies/${id}/soft`, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshClientPolicies()),
        catchError(this.handleError)
      );
  }

  private refreshClientPolicies(): void {
    const agentId = this.sessionService.getAgentId();
    if (agentId) {
      this.getClientPolicies({ agentId }).subscribe();
    }
  }

  // ============================================
  // SEARCH AND FILTERING
  // ============================================

  searchPolicies(request: SearchPoliciesRequest): Observable<PaginatedResponse<ClientPolicy>> {
    const params = this.buildHttpParams(request);
    
    return this.http.get<PaginatedResponse<ClientPolicy>>(`${this.baseUrl}/policies/search`, {
      ...this.getHttpOptions(),
      params
    }).pipe(catchError(this.handleError));
  }

  getPoliciesByStatus(request: GetPoliciesByStatusRequest): Observable<ClientPolicy[]> {
    const params = this.buildHttpParams(request);
    
    return this.http.get<PolicyResponse<ClientPolicy[]>>(`${this.baseUrl}/policies/status`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  // ============================================
  // EXPIRATION AND RENEWAL
  // ============================================

  getExpiringPolicies(request?: ExpiringPoliciesRequest): Observable<ClientPolicy[]> {
    const params = request ? this.buildHttpParams(request) : new HttpParams();
    
    return this.http.get<PolicyResponse<ClientPolicy[]>>(`${this.baseUrl}/expiring`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  renewPolicy(id: string, request: Omit<PolicyRenewalRequest, 'policyId'>): Observable<RenewalResponse> {
    return this.http.post<PolicyResponse<RenewalResponse>>(`${this.baseUrl}/policies/${id}/renew`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshClientPolicies()),
        catchError(this.handleError)
      );
  }

  getPolicyRenewalCandidates(request?: GetRenewalCandidatesRequest): Observable<PolicyRenewalCandidate[]> {
    const params = request ? this.buildHttpParams(request) : new HttpParams();
    
    return this.http.get<PolicyResponse<PolicyRenewalCandidate[]>>(`${this.baseUrl}/policies/renewal-candidates`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  bulkUpdatePolicyStatus(request: BulkUpdatePolicyStatusRequest): Observable<UpdateResponse> {
    return this.http.put<PolicyResponse<UpdateResponse>>(`${this.baseUrl}/policies/bulk/status`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshClientPolicies()),
        catchError(this.handleError)
      );
  }

  bulkCreatePolicies(policies: CreateClientPolicyRequest[]): Observable<CreateResponse[]> {
    return this.http.post<PolicyResponse<CreateResponse[]>>(`${this.baseUrl}/policies/bulk/create`, { policies }, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshClientPolicies()),
        catchError(this.handleError)
      );
  }

  bulkUpdatePolicies(updates: UpdateClientPolicyRequest[]): Observable<UpdateResponse[]> {
    return this.http.put<PolicyResponse<UpdateResponse[]>>(`${this.baseUrl}/policies/bulk/update`, { updates }, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshClientPolicies()),
        catchError(this.handleError)
      );
  }

  batchExpirePolicies(request: BatchExpirePoliciesRequest): Observable<UpdateResponse> {
    return this.http.post<PolicyResponse<UpdateResponse>>(`${this.baseUrl}/bulk/expire`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        tap(() => this.refreshClientPolicies()),
        catchError(this.handleError)
      );
  }

  // ============================================
  // POLICY TEMPLATES
  // ============================================

  getPolicyTemplates(filters?: PolicyTemplateFilterRequest): Observable<PolicyTemplate[]> {
    const params = filters ? this.buildHttpParams(filters) : new HttpParams();
    
    return this.http.get<PolicyResponse<PolicyTemplate[]>>(`${this.baseUrl}/templates`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  createPolicyTemplate(request: CreatePolicyTemplateRequest): Observable<CreateResponse> {
    return this.http.post<PolicyResponse<CreateResponse>>(`${this.baseUrl}/templates`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  updatePolicyTemplate(id: string, request: Omit<UpdatePolicyTemplateRequest, 'templateId'>): Observable<UpdateResponse> {
    return this.http.put<PolicyResponse<UpdateResponse>>(`${this.baseUrl}/templates/${id}`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  softDeletePolicyTemplate(id: string): Observable<DeleteResponse> {
    return this.http.delete<PolicyResponse<DeleteResponse>>(`${this.baseUrl}/templates/${id}`, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  // ============================================
  // REFERENCE DATA - INSURANCE COMPANIES
  // ============================================

  getInsuranceCompanies(isActive: boolean = true): Observable<InsuranceCompany[]> {
    const params = new HttpParams().set('isActive', isActive.toString());
    
    return this.http.get<PolicyResponse<InsuranceCompany[]>>(`${this.baseUrl}/companies`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  createInsuranceCompany(request: CreateInsuranceCompanyRequest): Observable<CreateResponse> {
    return this.http.post<PolicyResponse<CreateResponse>>(`${this.baseUrl}/companies`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  updateInsuranceCompany(id: string, request: Omit<UpdateInsuranceCompanyRequest, 'companyId'>): Observable<UpdateResponse> {
    return this.http.put<PolicyResponse<UpdateResponse>>(`${this.baseUrl}/companies/${id}`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  deleteInsuranceCompany(id: string, hardDelete: boolean = false): Observable<DeleteResponse> {
    const params = hardDelete ? new HttpParams().set('hardDelete', 'true') : new HttpParams();
    
    return this.http.delete<PolicyResponse<DeleteResponse>>(`${this.baseUrl}/companies/${id}`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  softDeleteInsuranceCompany(id: string): Observable<DeleteResponse> {
    return this.http.delete<PolicyResponse<DeleteResponse>>(`${this.baseUrl}/companies/${id}/soft`, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  // ============================================
  // REFERENCE DATA - POLICY TYPES
  // ============================================

  getPolicyTypes(isActive: boolean = true): Observable<PolicyType[]> {
    const params = new HttpParams().set('isActive', isActive.toString());
    
    return this.http.get<PolicyResponse<PolicyType[]>>(`${this.baseUrl}/types`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  createPolicyType(request: CreatePolicyTypeRequest): Observable<CreateResponse> {
    return this.http.post<PolicyResponse<CreateResponse>>(`${this.baseUrl}/types`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  updatePolicyType(id: string, request: Omit<UpdatePolicyTypeRequest, 'typeId'>): Observable<UpdateResponse> {
    return this.http.put<PolicyResponse<UpdateResponse>>(`${this.baseUrl}/types/${id}`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }
  // ✅ Soft Delete Policy Type
  softDeletePolicyType(typeId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/types/${typeId}/soft`);
  }

  // ============================================
  // REFERENCE DATA - POLICY CATEGORIES
  // ============================================

  getPolicyCategories(isActive: boolean = true): Observable<PolicyCategory[]> {
    const params = new HttpParams().set('isActive', isActive.toString());
    
    return this.http.get<PolicyResponse<PolicyCategory[]>>(`${this.baseUrl}/categories`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  createPolicyCategory(request: CreatePolicyCategoryRequest): Observable<CreateResponse> {
    return this.http.post<PolicyResponse<CreateResponse>>(`${this.baseUrl}/categories`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  updatePolicyCategory(id: string, request: Omit<UpdatePolicyCategoryRequest, 'categoryId'>): Observable<UpdateResponse> {
    return this.http.put<PolicyResponse<UpdateResponse>>(`${this.baseUrl}/categories/${id}`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  softDeletePolicyCategory(id: string): Observable<DeleteResponse> {
    return this.http.delete<PolicyResponse<DeleteResponse>>(`${this.baseUrl}/categories/${id}/soft`, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  // ============================================
  // ANALYTICS AND REPORTING
  // ============================================

  getPolicyStatistics(request?: PolicyStatisticsRequest): Observable<PolicyStatistics> {
    const params = request ? this.buildHttpParams(request) : new HttpParams();
    
    return this.http.get<PolicyResponse<PolicyStatistics>>(`${this.baseUrl}/statistics`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  getPolicyStatisticsDetailed(request?: PolicyStatisticsRequest): Observable<PolicyStatisticsDetailed[]> {
    const params = request ? this.buildHttpParams(request) : new HttpParams();
    
    return this.http.get<PolicyResponse<PolicyStatisticsDetailed[]>>(`${this.baseUrl}/statistics/detailed`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  getAgentDashboardSummary(agentId?: string): Observable<AgentDashboardSummary> {
    const id = agentId || this.sessionService.getAgentId();
    if (!id) {
      return throwError(() => new Error('Agent ID is required'));
    }
    
    return this.http.get<PolicyResponse<AgentDashboardSummary>>(`${this.baseUrl}/dashboard/${id}`, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  getPolicyHistory(request: GetPolicyHistoryRequest): Observable<PolicyHistory[]> {
    const params = this.buildHttpParams(request);
    
    return this.http.get<PolicyResponse<PolicyHistory[]>>(`${this.baseUrl}/history/${request.clientId}`, {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map(response => response.data || []),
      catchError(this.handleError)
    );
  }

  // ============================================
  // VALIDATION
  // ============================================

  validatePolicy(request: PolicyValidationRequest): Observable<PolicyValidationResponse> {
    return this.http.post<PolicyResponse<PolicyValidationResponse>>(`${this.baseUrl}/validate`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  // ============================================
  // EXPORT OPERATIONS
  // ============================================

  // exportPolicies(format: 'json' | 'csv' = 'json', agentId?: string): Observable<any> {
  //   const id = agentId || this.sessionService.getAgentId();
  //   let params = new HttpParams().set('format', format);
    
  //   if (id) {
  //     params = params.set('agentId', id);
  //   }
    
  //   return this.http.get(`${this.baseUrl}/export`, {
  //     ...this.getHttpOptions(),
  //     params,
  //     responseType: format === 'csv' ? 'text' : 'json'
  //   }).pipe(catchError(this.handleError));
  // }

  // ============================================
  // UTILITY OPERATIONS
  // ============================================

  cleanupSoftDeletedRecords(request: CleanupSoftDeletedRequest): Observable<CleanupResponse[]> {
    return this.http.post<PolicyResponse<CleanupResponse[]>>(`${this.baseUrl}/cleanup/soft-deleted`, request, this.getHttpOptions())
      .pipe(
        map(response => response.data || []),
        catchError(this.handleError)
      );
  }

  

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  // Get current agent's policies
  getMyPolicies(): Observable<ClientPolicy[]> {
    const agentId = this.sessionService.getAgentId();
    if (!agentId) {
      return throwError(() => new Error('No agent ID available'));
    }
    
    return this.getClientPolicies({ agentId });
  }

  // Get current agent's policy catalog
  getMyCatalog(): Observable<PolicyCatalog[]> {
    const agentId = this.sessionService.getAgentId();
    if (!agentId) {
      return throwError(() => new Error('No agent ID available'));
    }
    
    return this.getPolicyCatalog({ agentId });
  }

  // Get current agent's dashboard
  getMyDashboard(): Observable<AgentDashboardSummary> {
    const agentId = this.sessionService.getAgentId();
    if (!agentId) {
      return throwError(() => new Error('No agent ID available'));
    }
    
    return this.getAgentDashboardSummary(agentId);
  }

  // Get current agent's expiring policies
  getMyExpiringPolicies(daysAhead: number = 30): Observable<ClientPolicy[]> {
    const agentId = this.sessionService.getAgentId();
    if (!agentId) {
      return throwError(() => new Error('No agent ID available'));
    }
    
    return this.getExpiringPolicies({ agentId, daysAhead });
  }

  // Get current agent's policy statistics
  getMyStatistics(): Observable<PolicyStatistics> {
    const agentId = this.sessionService.getAgentId();
    if (!agentId) {
      return throwError(() => new Error('No agent ID available'));
    }
    
    return this.getPolicyStatistics({ agentId });
  }

  // Clear cached data
  clearCache(): void {
    console.log('Clearing policy service cache');
    this.policiesSubject.next([]);
    this.policyCatalogSubject.next([]);
    this.setLoading(false);
  }

  // Initialize data for current agent
  initializeForCurrentAgent(): void {
    const agentId = this.sessionService.getAgentId();
    if (agentId) {
      console.log('Initializing policy data for agent:', agentId);
      
      // Load initial data
      this.getClientPolicies({ agentId }).subscribe({
        next: () => console.log('Client policies loaded'),
        error: (error) => console.error('Failed to load client policies:', error)
      });
      
      this.getPolicyCatalog({ agentId }).subscribe({
        next: () => console.log('Policy catalog loaded'),
        error: (error) => console.error('Failed to load policy catalog:', error)
      });
    }
  }

  // ============================================
  // HELPER METHODS FOR COMMON OPERATIONS
  // ============================================

  // Check if a policy is expiring soon
  isPolicyExpiringSoon(policy: ClientPolicy, daysThreshold: number = 30): boolean {
    if (!policy.endDate) return false;
    
    const today = new Date();
    const endDate = new Date(policy.endDate);
    const timeDiff = endDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff <= daysThreshold && daysDiff >= 0;
  }

  // Check if a policy is expired
  isPolicyExpired(policy: ClientPolicy): boolean {
    if (!policy.endDate) return false;
    
    const today = new Date();
    const endDate = new Date(policy.endDate);
    
    return endDate < today;
  }

  // Get policy status color for UI
  getPolicyStatusColor(policy: ClientPolicy): string {
    if (this.isPolicyExpired(policy)) {
      return 'danger';
    } else if (this.isPolicyExpiringSoon(policy)) {
      return 'warning';
    } else if (policy.status === 'Active') {
      return 'success';
    } else {
      return 'secondary';
    }
  }

  // Format policy duration
  getPolicyDuration(policy: ClientPolicy): string {
    if (!policy.startDate || !policy.endDate) return 'Unknown';
    
    const start = new Date(policy.startDate);
    const end = new Date(policy.endDate);
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff >= 365) {
      const years = Math.floor(daysDiff / 365);
      return `${years} year${years > 1 ? 's' : ''}`;
    } else if (daysDiff >= 30) {
      const months = Math.floor(daysDiff / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      return `${daysDiff} day${daysDiff > 1 ? 's' : ''}`;
    }
  }

  // Get days until expiry
  getDaysUntilExpiry(policy: ClientPolicy): number | null {
    if (!policy.endDate) return null;
    
    const today = new Date();
    const endDate = new Date(policy.endDate);
    const timeDiff = endDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff;
  }

  // ============================================
  // SEARCH AND FILTER HELPERS
  // ============================================

  // Search policies by term
  searchPoliciesByTerm(term: string, policies?: ClientPolicy[]): Observable<ClientPolicy[]> {
    const agentId = this.sessionService.getAgentId();
    
    if (policies && policies.length > 0) {
      // Search in provided policies array
      const filtered = policies.filter(policy =>
        policy.policyName?.toLowerCase().includes(term.toLowerCase()) ||
        policy.status?.toLowerCase().includes(term.toLowerCase()) ||
        policy.companyName?.toLowerCase().includes(term.toLowerCase()) ||
        policy.typeName?.toLowerCase().includes(term.toLowerCase())
      );
      return new Observable(observer => {
        observer.next(filtered);
        observer.complete();
      });
    } else {
      // Search using API
      return this.searchPolicies({
        searchTerm: term,
        agentId: agentId!,
        pageSize: 100,
        pageNumber: 1
      }).pipe(
        map(response => response.data)
      );
    }
  }

  // Filter policies by status
  filterPoliciesByStatus(status: string, policies?: ClientPolicy[]): Observable<ClientPolicy[]> {
    if (policies && policies.length > 0) {
      // Filter in provided policies array
      const filtered = policies.filter(policy =>
        policy.status?.toLowerCase() === status.toLowerCase()
      );
      return new Observable(observer => {
        observer.next(filtered);
        observer.complete();
      });
    } else {
      // Filter using API
      const agentId = this.sessionService.getAgentId();
      return this.getPoliciesByStatus({
        status,
        agentId: agentId!
      });
    }
  }

  // Filter policies by company
  filterPoliciesByCompany(companyId: string, policies?: ClientPolicy[]): ClientPolicy[] {
    const allPolicies = policies || this.policiesSubject.value;
    return allPolicies.filter(policy => policy.companyId === companyId);
  }

  // Filter policies by type
  filterPoliciesByType(typeId: string, policies?: ClientPolicy[]): ClientPolicy[] {
    const allPolicies = policies || this.policiesSubject.value;
    return allPolicies.filter(policy => policy.typeId === typeId);
  }

  // ============================================
  // NOTIFICATION HELPERS
  // ============================================

  // Get renewal notifications
  getRenewalNotifications(daysAhead: number = 30): Observable<{
    count: number;
    policies: ClientPolicy[];
  }> {
    return this.getMyExpiringPolicies(daysAhead).pipe(
      map(policies => ({
        count: policies.length,
        policies
      }))
    );
  }

  // Get expired policy notifications
  getExpiredPolicyNotifications(): Observable<{
    count: number;
    policies: ClientPolicy[];
  }> {
    return this.getMyPolicies().pipe(
      map(policies => {
        const expiredPolicies = policies.filter(policy => this.isPolicyExpired(policy));
        return {
          count: expiredPolicies.length,
          policies: expiredPolicies
        };
      })
    );
  }

  // ============================================
  // BATCH OPERATIONS HELPERS
  // ============================================

  // Bulk activate policies
  bulkActivatePolicies(policyIds: string[]): Observable<UpdateResponse> {
    return this.bulkUpdatePolicyStatus({
      policyIds,
      newStatus: 'Active'
    });
  }

  // Bulk deactivate policies
  bulkDeactivatePolicies(policyIds: string[]): Observable<UpdateResponse> {
    return this.bulkUpdatePolicyStatus({
      policyIds,
      newStatus: 'Inactive'
    });
  }

  // Bulk expire policies
  bulkExpirePolicies(policyIds: string[]): Observable<UpdateResponse> {
    return this.bulkUpdatePolicyStatus({
      policyIds,
      newStatus: 'Expired'
    });
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  // Validate policy dates
  validatePolicyDates(startDate: Date, endDate: Date): { isValid: boolean; message?: string } {
    if (endDate <= startDate) {
      return {
        isValid: false,
        message: 'End date must be after start date'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return {
        isValid: false,
        message: 'Start date cannot be in the past'
      };
    }

    return { isValid: true };
  }

  // Validate required fields for policy creation
  validatePolicyCreation(policy: CreateClientPolicyRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!policy.clientId) errors.push('Client is required');
    if (!policy.policyName?.trim()) errors.push('Policy name is required');
    if (!policy.startDate) errors.push('Start date is required');
    if (!policy.endDate) errors.push('End date is required');

    if (policy.startDate && policy.endDate) {
      const dateValidation = this.validatePolicyDates(
        new Date(policy.startDate),
        new Date(policy.endDate)
      );
      if (!dateValidation.isValid) {
        errors.push(dateValidation.message!);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================
  // REPORTING HELPERS
  // ============================================

  // Get policy summary report
  getPolicySummaryReport(): Observable<{
    totalPolicies: number;
    activePolicies: number;
    expiredPolicies: number;
    expiringSoon: number;
    byCompany: { name: string; count: number }[];
    byType: { name: string; count: number }[];
    byStatus: { status: string; count: number }[];
  }> {
    return this.getMyPolicies().pipe(
      map(policies => {
        const totalPolicies = policies.length;
        const activePolicies = policies.filter(p => p.status === 'Active').length;
        const expiredPolicies = policies.filter(p => this.isPolicyExpired(p)).length;
        const expiringSoon = policies.filter(p => this.isPolicyExpiringSoon(p)).length;

        // Group by company
        const companyGroups = policies.reduce((acc, policy) => {
          const company = policy.companyName || 'Unknown';
          acc[company] = (acc[company] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const byCompany = Object.entries(companyGroups).map(([name, count]) => ({
          name,
          count
        }));

        // Group by type
        const typeGroups = policies.reduce((acc, policy) => {
          const type = policy.typeName || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const byType = Object.entries(typeGroups).map(([name, count]) => ({
          name,
          count
        }));

        // Group by status
        const statusGroups = policies.reduce((acc, policy) => {
          const status = policy.status || 'Unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const byStatus = Object.entries(statusGroups).map(([status, count]) => ({
          status,
          count
        }));

        return {
          totalPolicies,
          activePolicies,
          expiredPolicies,
          expiringSoon,
          byCompany,
          byType,
          byStatus
        };
      })
    );
  }

  // ============================================
  // DEBUGGING AND LOGGING
  // ============================================

  // Debug method to log current state
  debugCurrentState(): void {
    console.log('=== POLICY SERVICE DEBUG INFO ===');
    console.log('Current Agent ID:', this.sessionService.getAgentId());
    console.log('Loading State:', this.loadingSubject.value);
    console.log('Cached Policies Count:', this.policiesSubject.value.length);
    console.log('Cached Catalog Count:', this.policyCatalogSubject.value.length);
    console.log('Base URL:', this.baseUrl);
    console.log('================================');
  }

  // Method to refresh all data
  refreshAllData(): void {
    console.log('Refreshing all policy data...');
    const agentId = this.sessionService.getAgentId();
    
    if (agentId) {
      this.refreshClientPolicies();
      this.refreshPolicyCatalog();
    } else {
      console.warn('No agent ID available for data refresh');
    }
  }
}