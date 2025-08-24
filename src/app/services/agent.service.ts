import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  Agent,
  AgentProfile,
  AgentSettings,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ChangePasswordRequest,
  PasswordResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  InsuranceCompany,
  PolicyType
} from '../interfaces/Agent';
export interface NavbarBadgeCounts {
  clients: number;
  policies: number;
  reminders: number;
  appointments: number;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private baseUrl = 'https://aminius-backend.onrender.com/api'; 

  constructor(private http: HttpClient) {
    console.log('AgentService initialized with baseUrl:', this.baseUrl);
  }

  // Agent Profile Management
  upsertAgentProfile(agentData: {
    agentId?: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    passwordHash: string;
    avatar?: string;
  }): Observable<{ agentId: string }> {
    console.log('AgentService: Upserting agent profile');
    return this.http.post<{ agentId: string }>(`${this.baseUrl}/agent`, agentData)
      .pipe(
        tap(response => console.log('Upsert agent profile response:', response)),
        catchError(this.handleError)
      );
  }

  getAgentProfile(agentId: string): Observable<AgentProfile> {
    console.log('AgentService: Getting agent profile for ID:', agentId);
    return this.http.get<AgentProfile>(`${this.baseUrl}/agent/${agentId}`)
      .pipe(
        tap(response => console.log('Get agent profile response:', response)),
        catchError(this.handleError)
      );
  }

  // Settings Management
  updateAgentSettings(agentId: string, settings: Partial<AgentSettings>): Observable<{ message: string }> {
    console.log('AgentService: Updating agent settings for ID:', agentId);
    return this.http.put<{ message: string }>(`${this.baseUrl}/agent/${agentId}/settings`, settings)
      .pipe(
        tap(response => console.log('Update agent settings response:', response)),
        catchError(this.handleError)
      );
  }

  // Authentication Methods
  authenticateAgent(email: string): Observable<AgentProfile> {
    console.log('AgentService: Authenticating agent with email:', email);
    return this.http.post<AgentProfile>(`${this.baseUrl}/agent/authenticate`, { email })
      .pipe(
        tap(response => console.log('Authenticate agent response:', response)),
        catchError(this.handleError)
      );
  }

  loginAgent(credentials: LoginRequest): Observable<LoginResponse> {
    console.log('AgentService: Logging in agent with email:', credentials.Email);
    return this.http.post<LoginResponse>(`${this.baseUrl}/agent/login`, {
      email: credentials.Email,
      password: credentials.Password
    })
      .pipe(
        tap(response => console.log('Login agent response:', { 
          ...response, 
          StoredPasswordHash: response.StoredPasswordHash ? '[HIDDEN]' : undefined 
        })),
        catchError(this.handleError)
      );
  }

  // Registration
  registerAgent(request: RegisterRequest): Observable<RegisterResponse> {
    console.log('AgentService: Registering agent with email:', request.Email);
    console.log('Registration request payload:', { 
      ...request, 
      PasswordHash: '[HIDDEN]' 
    });
    
    return this.http.post<RegisterResponse>(`${this.baseUrl}/agent/register`, request)
      .pipe(
        tap(response => console.log('Register agent response:', response)),
        catchError(this.handleError)
      );
  }

  // Password Management
  changeAgentPassword(
    agentId: string, 
    passwordData: { oldPasswordHash: string; newPasswordHash: string }
  ): Observable<PasswordResponse> {
    console.log('AgentService: Changing password for agent ID:', agentId);
    return this.http.post<PasswordResponse>(`${this.baseUrl}/agent/${agentId}/change-password`, passwordData)
      .pipe(
        tap(response => console.log('Change password response:', response)),
        catchError(this.handleError)
      );
  }

  requestPasswordReset(request: PasswordResetRequest): Observable<PasswordResetResponse> {
    console.log('AgentService: Requesting password reset for email:', request.Email);
    return this.http.post<PasswordResetResponse>(`${this.baseUrl}/agent/password-reset/request`, {
      email: request.Email
    })
      .pipe(
        tap(response => console.log('Password reset request response:', response)),
        catchError(this.handleError)
      );
  }

  resetAgentPassword(agentId: string, newPasswordHash: string): Observable<PasswordResponse> {
    console.log('AgentService: Resetting password for agent ID:', agentId);
    return this.http.post<PasswordResponse>(`${this.baseUrl}/agent/${agentId}/password-reset`, { 
      newPasswordHash 
    })
      .pipe(
        tap(response => console.log('Password reset response:', response)),
        catchError(this.handleError)
      );
  }

  // Data Lookups
  getInsuranceCompanies(): Observable<InsuranceCompany[]> {
    console.log('AgentService: Getting insurance companies');
    return this.http.get<InsuranceCompany[]>(`${this.baseUrl}/insurance-companies`)
      .pipe(
        tap(response => console.log('Insurance companies response:', response)),
        catchError(this.handleError)
      );
  }
getNavbarBadgeCounts(agentId: string): Observable<NavbarBadgeCounts> {
  return this.http.get<NavbarBadgeCounts>(`${this.baseUrl}/agent/${agentId}/navbar-counts`);
  }
  getPolicyTypes(): Observable<PolicyType[]> {
    console.log('AgentService: Getting policy types');
    return this.http.get<PolicyType[]>(`${this.baseUrl}/policy-types`)
      .pipe(
        tap(response => console.log('Policy types response:', response)),
        catchError(this.handleError)
      );
  }

  // Error Handling
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('AgentService HTTP Error:', error);
    
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
      } else if (error.error?.error) {
        errorMessage = error.error.error;
      } else if (error.status === 0) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.status === 404) {
        errorMessage = 'Service not found. Please check the server configuration.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed. Please check your credentials.';
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

  // Helper method to check if service is available
  checkServiceHealth(): Observable<any> {
    console.log('AgentService: Checking service health');
    return this.http.get(`${this.baseUrl}/health`)
      .pipe(
        tap(response => console.log('Service health check response:', response)),
        catchError(error => {
          console.warn('Service health check failed:', error);
          return throwError(() => error);
        })
      );
  }

  // Debug method to log current configuration
  debugService(): void {
    console.log('=== AGENT SERVICE DEBUG INFO ===');
    console.log('Base URL:', this.baseUrl);
    console.log('Service initialized:', !!this.http);
    console.log('===============================');
  }
   
}