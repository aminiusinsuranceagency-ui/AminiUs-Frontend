import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { AgentProfile } from '../interfaces/Agent';

export interface SessionData {
  user: AgentProfile;
  token?: string;
  loginTime: string;
  rememberMe: boolean;
  agentId: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private currentUserSubject = new BehaviorSubject<AgentProfile | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly SESSION_KEY = 'aminusSession';
  private readonly USER_REGISTERED_KEY = 'aminusUserRegistered';

  constructor(private router: Router) {
    console.log('SessionService initialized');
    this.initializeSession();
  }

  private initializeSession(): void {
    console.log('Initializing session...');
    const session = this.getSession();
    if (session) {
      console.log('Valid session found:', { 
        user: session.user?.FirstName || 'Unknown', 
        agentId: session.agentId 
      });
      this.currentUserSubject.next(session.user);
      this.isAuthenticatedSubject.next(true);
    } else {
      console.log('No valid session found');
    }
  }

  getSession(): SessionData | null {
    try {
      const session = localStorage.getItem(this.SESSION_KEY);
      console.log('Getting session from localStorage:', session ? 'exists' : 'not found');
      
      if (session) {
        const sessionData: SessionData = JSON.parse(session);
        console.log('Parsed session data:', { 
          hasUser: !!sessionData.user,
          userEmail: sessionData.user?.Email || 'Unknown',
          agentId: sessionData.agentId,
          loginTime: sessionData.loginTime,
          rememberMe: sessionData.rememberMe
        });
        
        // Validate session structure
        if (sessionData.user && sessionData.agentId && sessionData.user.AgentId) {
          // Check if session is expired
          if (this.isSessionExpired(sessionData)) {
            console.log('Session expired, clearing...');
            this.clearSession();
            return null;
          }
          return sessionData;
        } else {
          console.warn('Invalid session structure:', {
            hasUser: !!sessionData.user,
            hasAgentId: !!sessionData.agentId,
            hasUserAgentId: !!sessionData.user?.AgentId
          });
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('Invalid session data:', error);
      this.clearSession();
    }
    return null;
  }

  setSession(sessionData: SessionData): void {
    try {
      console.log('Setting session for user:', {
        name: sessionData.user?.FirstName || 'Unknown',
        email: sessionData.user?.Email || 'Unknown',
        agentId: sessionData.agentId
      });
      
      // Validate required session data
      if (!sessionData.user || !sessionData.agentId) {
        throw new Error('Invalid session data: missing user or agentId');
      }

      if (!sessionData.user.AgentId) {
        console.warn('User object missing AgentId, adding from session agentId');
        sessionData.user.AgentId = sessionData.agentId;
      }

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
      this.currentUserSubject.next(sessionData.user);
      this.isAuthenticatedSubject.next(true);
      console.log('Session set successfully');
    } catch (error) {
      console.error('Error setting session:', error);
      throw error;
    }
  }

  clearSession(): void {
    console.log('Clearing session...');
    try {
      localStorage.removeItem(this.SESSION_KEY);
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      console.log('Session cleared successfully');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  getCurrentUser(): AgentProfile | null {
    const user = this.currentUserSubject.value;
    console.log('Getting current user:', user ? `${user.FirstName} ${user.LastName}` : 'none');
    return user;
  }

  getAgentId(): string | null {
    const session = this.getSession();
    const agentId = session ? session.agentId : null;
    console.log('Getting agent ID:', agentId);
    return agentId;
  }

  getToken(): string | null {
    const session = this.getSession();
    const token = session ? session.token || null : null;
    console.log('Getting token:', token ? 'exists' : 'none');
    return token;
  }

  isAuthenticated(): boolean {
    const authenticated = this.isAuthenticatedSubject.value;
    console.log('Checking authentication status:', authenticated);
    return authenticated;
  }

  isSessionExpired(sessionData?: SessionData): boolean {
    const session = sessionData || this.getSession();
    if (!session) {
      console.log('No session to check expiry');
      return true;
    }

    try {
      const loginTime = new Date(session.loginTime);
      const now = new Date();
      const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);

      // Session expires after 24 hours, or 7 days if "remember me" is checked
      const maxHours = session.rememberMe ? 168 : 24; // 7 days : 1 day
      
      const expired = hoursSinceLogin >= maxHours;
      console.log('Session expiry check:', {
        hoursSinceLogin: hoursSinceLogin.toFixed(2),
        maxHours,
        expired,
        rememberMe: session.rememberMe
      });
      
      return expired;
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return true;
    }
  }

  refreshSession(): void {
    console.log('Refreshing session...');
    const session = this.getSession();
    if (session && !this.isSessionExpired(session)) {
      // Update login time to extend session
      session.loginTime = new Date().toISOString();
      this.setSession(session);
      console.log('Session refreshed successfully');
    } else {
      console.log('Cannot refresh expired or invalid session');
    }
  }

  logout(showMessage: boolean = true): void {
    console.log('Logging out user...');
    this.clearSession();
    
    if (showMessage) {
      console.log('Logout message should be shown');
    }
    
    this.router.navigate(['/login']);
  }

  // Method to update user profile in session
  updateUserProfile(updatedUser: Partial<AgentProfile>): void {
    console.log('Updating user profile in session...');
    const session = this.getSession();
    if (session) {
      session.user = { ...session.user, ...updatedUser };
      this.setSession(session);
      console.log('User profile updated in session');
    } else {
      console.warn('No session to update user profile');
    }
  }

  // Method to check if user has specific permissions (extend as needed)
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) {
      console.log('No user to check permissions for');
      return false;
    }
    
    // Implement your permission logic here
    // For now, all authenticated users have all permissions
    console.log('Permission check for', permission, ': granted');
    return true;
  }

  // Method to mark user as registered
  markUserAsRegistered(): void {
    localStorage.setItem(this.USER_REGISTERED_KEY, 'true');
    console.log('User marked as registered');
  }

  // Method to check if user has registered before
  hasUserRegistered(): boolean {
    const hasRegistered = localStorage.getItem(this.USER_REGISTERED_KEY) === 'true';
    console.log('User registration status:', hasRegistered);
    return hasRegistered;
  }

  // Method to clear registration status (for development/testing)
  clearRegistrationStatus(): void {
    localStorage.removeItem(this.USER_REGISTERED_KEY);
    console.log('Registration status cleared');
  }

  // Helper method to validate session data structure
  private validateSessionData(sessionData: SessionData): boolean {
    if (!sessionData) {
      console.error('Session data is null or undefined');
      return false;
    }

    if (!sessionData.user) {
      console.error('Session data missing user object');
      return false;
    }

    if (!sessionData.agentId) {
      console.error('Session data missing agentId');
      return false;
    }

    if (!sessionData.loginTime) {
      console.error('Session data missing loginTime');
      return false;
    }

    // Check required user fields
    const requiredUserFields = ['AgentId', 'FirstName', 'LastName', 'Email'];
    for (const field of requiredUserFields) {
      if (!sessionData.user[field as keyof AgentProfile]) {
        console.error(`Session user data missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }

  // Debug method to log session info
  debugSession(): void {
    const session = this.getSession();
    console.log('=== SESSION DEBUG INFO ===');
    console.log('Session exists:', !!session);
    if (session) {
      console.log('User:', session.user?.FirstName || 'Unknown', session.user?.LastName || 'Unknown');
      console.log('Email:', session.user?.Email || 'Unknown');
      console.log('Agent ID:', session.agentId);
      console.log('User Agent ID:', session.user?.AgentId || 'Missing');
      console.log('Login Time:', session.loginTime);
      console.log('Remember Me:', session.rememberMe);
      console.log('Token exists:', !!session.token);
      console.log('Session expired:', this.isSessionExpired(session));
      console.log('Session valid:', this.validateSessionData(session));
    }
    console.log('Is Authenticated:', this.isAuthenticated());
    console.log('Has Registered:', this.hasUserRegistered());
    console.log('========================');
  }

  // Method to handle session from login response
  createSessionFromLoginResponse(loginResponse: any, formData: any): SessionData {
    console.log('Creating session from login response');
    
    let agentProfile: AgentProfile;
    
    // Parse agent profile from response
    if (typeof loginResponse.AgentProfile === 'string') {
      try {
        agentProfile = JSON.parse(loginResponse.AgentProfile);
      } catch (error) {
        console.error('Failed to parse AgentProfile JSON string:', error);
        throw new Error('Invalid agent profile data received from server');
      }
    } else if (typeof loginResponse.AgentProfile === 'object') {
      agentProfile = loginResponse.AgentProfile as AgentProfile;
    } else {
      throw new Error('No agent profile data received from server');
    }

    // Ensure AgentId is set
    if (!agentProfile.AgentId && loginResponse.AgentId) {
      agentProfile.AgentId = loginResponse.AgentId;
    }

    const sessionData: SessionData = {
      user: agentProfile,
      token: loginResponse.Token || '',
      loginTime: new Date().toISOString(),
      rememberMe: formData.rememberMe || false,
      agentId: loginResponse.AgentId || agentProfile.AgentId
    };

    console.log('Session data created:', {
      userEmail: sessionData.user.Email,
      agentId: sessionData.agentId,
      hasToken: !!sessionData.token,
      rememberMe: sessionData.rememberMe
    });

    return sessionData;
  }
}