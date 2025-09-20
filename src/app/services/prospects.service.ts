import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  Prospect,
  ProspectExternalPolicy,
  ProspectStatistics,
  ExpiringProspectPolicy,
  AddProspectRequest,
  AddProspectResponse,
  AddProspectPolicyRequest,
  AddProspectPolicyResponse,
  UpdateProspectRequest,
  ConvertProspectToClientRequest,
  ConvertProspectToClientResponse,
  AutoCreateRemindersResponse,
  ProspectApiResponse
} from '../interfaces/prospects';

@Injectable({
  providedIn: 'root'
})
export class ProspectsService {

  private baseUrl = 'https://aminius-backend.onrender.com/api';

  constructor(private http: HttpClient) {
    console.log('ProspectService initialized with baseUrl:', this.baseUrl);
  }

  // =========================
  // Prospect Management
  // =========================

  /**
   * Add a new prospect
   */
  addProspect(prospectData: AddProspectRequest): Observable<AddProspectResponse> {
    console.log('ProspectService: Adding prospect with data:', {
      ...prospectData,
      AgentId: prospectData.AgentId ? '[MASKED]' : 'null'
    });
    
    return this.http.post<AddProspectResponse>(`${this.baseUrl}/prospect`, prospectData)
      .pipe(
        tap(response => console.log('Add prospect response:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Update existing prospect
   */
  updateProspect(prospectId: string, prospectData: UpdateProspectRequest): Observable<ProspectApiResponse> {
    console.log('ProspectService: Updating prospect ID:', prospectId);
    
    return this.http.put<ProspectApiResponse>(`${this.baseUrl}/prospect/${prospectId}`, prospectData)
      .pipe(
        tap(response => console.log('Update prospect response:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Delete prospect
   */
  deleteProspect(prospectId: string): Observable<ProspectApiResponse> {
    console.log('ProspectService: Deleting prospect ID:', prospectId);
    
    return this.http.delete<ProspectApiResponse>(`${this.baseUrl}/prospect/${prospectId}`)
      .pipe(
        tap(response => console.log('Delete prospect response:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Get all prospects for an agent
   */
  getAgentProspects(agentId: string): Observable<Prospect[]> {
    console.log('ProspectService: Getting prospects for agent ID:', agentId);
    
    return this.http.get<Prospect[]>(`${this.baseUrl}/agent/${agentId}/prospects`)
      .pipe(
        tap(response => console.log('Get agent prospects response:', response?.length, 'prospects')),
        catchError(this.handleError)
      );
  }

  // =========================
  // Prospect Policies
  // =========================

  /**
   * Add external policy to prospect
   */
  addProspectPolicy(policyData: AddProspectPolicyRequest): Observable<AddProspectPolicyResponse> {
    console.log('ProspectService: Adding prospect policy for prospect:', policyData.ProspectId);
    
    return this.http.post<AddProspectPolicyResponse>(`${this.baseUrl}/prospect/policy`, policyData)
      .pipe(
        tap(response => console.log('Add prospect policy response:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Get prospect's external policies
   */
  getProspectPolicies(prospectId: string): Observable<ProspectExternalPolicy[]> {
    console.log('ProspectService: Getting policies for prospect ID:', prospectId);
    
    return this.http.get<ProspectExternalPolicy[]>(`${this.baseUrl}/prospect/${prospectId}/policies`)
      .pipe(
        tap(response => console.log('Get prospect policies response:', response?.length, 'policies')),
        catchError(this.handleError)
      );
  }

  // =========================
  // Conversion
  // =========================

  /**
   * Convert prospect to client
   */
  convertProspectToClient(
    prospectId: string, 
    conversionData: ConvertProspectToClientRequest
  ): Observable<ConvertProspectToClientResponse> {
    console.log('ProspectService: Converting prospect to client:', prospectId);
    
    return this.http.post<ConvertProspectToClientResponse>(
      `${this.baseUrl}/prospect/${prospectId}/convert-to-client`, 
      conversionData
    )
      .pipe(
        tap(response => console.log('Convert prospect to client response:', response)),
        catchError(this.handleError)
      );
  }

  // =========================
  // Analytics & Statistics
  // =========================

  /**
   * Get prospect statistics for dashboard
   */
  getProspectStatistics(agentId: string): Observable<ProspectStatistics> {
    console.log('ProspectService: Getting prospect statistics for agent:', agentId);
    
    return this.http.get<ProspectStatistics>(`${this.baseUrl}/agent/${agentId}/prospect-statistics`)
      .pipe(
        tap(response => console.log('Get prospect statistics response:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Get prospects with policies expiring soon
   */
  getExpiringProspectPolicies(agentId: string, daysAhead: number = 30): Observable<ExpiringProspectPolicy[]> {
    console.log('ProspectService: Getting expiring prospect policies for agent:', agentId, 'days ahead:', daysAhead);
    
    let params = new HttpParams();
    if (daysAhead && daysAhead !== 30) {
      params = params.set('daysAhead', daysAhead.toString());
    }
    
    return this.http.get<ExpiringProspectPolicy[]>(
      `${this.baseUrl}/agent/${agentId}/expiring-prospect-policies`,
      { params }
    )
      .pipe(
        tap(response => console.log('Get expiring prospect policies response:', response?.length, 'expiring policies')),
        catchError(this.handleError)
      );
  }

  // =========================
  // Automation
  // =========================

  /**
   * Auto-create reminders for expiring prospect policies
   */
  autoCreateProspectReminders(agentId: string): Observable<AutoCreateRemindersResponse> {
    console.log('ProspectService: Auto-creating prospect reminders for agent:', agentId);
    
    return this.http.post<AutoCreateRemindersResponse>(
      `${this.baseUrl}/agent/${agentId}/prospect-reminders/auto-create`,
      {}
    )
      .pipe(
        tap(response => console.log('Auto-create prospect reminders response:', response)),
        catchError(this.handleError)
      );
  }

  // =========================
  // Utility Methods
  // =========================

  /**
   * Format prospect full name
   */
  formatProspectName(prospect: Prospect): string {
    const parts = [prospect.FirstName];
    if (prospect.Surname) parts.push(prospect.Surname);
    if (prospect.LastName) parts.push(prospect.LastName);
    return parts.join(' ');
  }

  /**
   * Get priority color class based on days until expiry
   */
  getPriorityColorClass(priority: 'High' | 'Medium' | 'Low'): string {
    switch (priority) {
      case 'High': return 'text-red-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  /**
   * Calculate priority based on days until expiry
   */
  calculatePriority(daysUntilExpiry: number): 'High' | 'Medium' | 'Low' {
    if (daysUntilExpiry <= 7) return 'High';
    if (daysUntilExpiry <= 15) return 'Medium';
    return 'Low';
  }

  /**
   * Check if prospect has contact information
   */
  hasContactInfo(prospect: Prospect): boolean {
    return !!(prospect.PhoneNumber || prospect.Email);
  }

  /**
   * Format expiry date for display
   */
  formatExpiryDate(date: Date): string {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Get days until expiry text
   */
  getDaysUntilExpiryText(days: number): string {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `${days} days remaining`;
  }

  // =========================
  // Error Handling
  // =========================

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('ProspectService HTTP Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
      console.error('Client-side error:', error.error.message);
    } else {
      // Server-side error
      console.error('Server-side error:', {
        status: error.status,
        statusText: error.statusText,
        body: error.error
      });
      
      if (error.error?.Message) {
        errorMessage = error.error.Message;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.error?.error) {
        errorMessage = error.error.error;
      } else if (error.status === 0) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.status === 404) {
        errorMessage = 'Prospect service not found. Please check the server configuration.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.status === 400) {
        errorMessage = 'Invalid request data. Please check your input.';
      } else {
        errorMessage = `HTTP Error ${error.status}: ${error.statusText}`;
      }
    }
    
    return throwError(() => ({
      error: {
        Message: errorMessage,
        status: error.status,
        statusText: error.statusText,
        originalError: error
      }
    }));
  }

  // =========================
  // Debug Methods
  // =========================

  /**
   * Check service health
   */
  checkServiceHealth(): Observable<any> {
    console.log('ProspectService: Checking service health');
    return this.http.get(`${this.baseUrl}/health`)
      .pipe(
        tap(response => console.log('Prospect service health check response:', response)),
        catchError(error => {
          console.warn('Prospect service health check failed:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Debug service configuration
   */
  debugService(): void {
    console.log('=== PROSPECT SERVICE DEBUG INFO ===');
    console.log('Base URL:', this.baseUrl);
    console.log('Service initialized:', !!this.http);
    console.log('===================================');
  }
}