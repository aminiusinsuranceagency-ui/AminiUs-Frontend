import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  Reminder,
  ReminderSettings,
  CreateReminderRequest,
  UpdateReminderRequest,
  ReminderFilters,
  PaginatedReminderResponse,
  BirthdayReminder,
  PolicyExpiryReminder,
  PhoneValidationResult,
  ReminderStatistics
} from '../interfaces/Reminder';

const API_BASE = `https://aminius-backend.onrender.com/api/reminders`;

@Injectable({
  providedIn: 'root'
})
export class RemindersService {
  constructor(private http: HttpClient) {
    console.log('🚀 RemindersService initialized with API_BASE:', API_BASE);
  }

  /** =====================
   * CRUD
   * ===================== */
  createReminder(agentId: string, body: CreateReminderRequest): Observable<Reminder> {
    console.log('📝 CREATE REMINDER - Starting...');
    console.log('📝 AgentId:', agentId);
    console.log('📝 Request body:', JSON.stringify(body, null, 2));
    
    const url = `${API_BASE}/${agentId}`;
    console.log('📝 Request URL:', url);

    return this.http.post<Reminder>(url, body).pipe(
      tap(response => {
        console.log('✅ CREATE REMINDER - Success:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ CREATE REMINDER - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        console.error('❌ Full Error:', error);
        return this.handleError('createReminder', error);
      })
    );
  }

  getAllReminders(agentId: string, filters?: ReminderFilters): Observable<PaginatedReminderResponse> {
    console.log('📋 GET ALL REMINDERS - Starting...');
    console.log('📋 AgentId:', agentId);
    console.log('📋 Filters:', filters);

    let params = new HttpParams();
    if (filters) {
      console.log('📋 Processing filters...');
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
          console.log(`📋 Filter added - ${key}: ${value}`);
        }
      });
    }

    const url = `${API_BASE}/${agentId}`;
    console.log('📋 Request URL:', url);
    console.log('📋 Request params:', params.toString());

    return this.http.get<PaginatedReminderResponse>(url, { params }).pipe(
      tap(response => {
        console.log('✅ GET ALL REMINDERS - Success:');
        console.log('✅ Total records:', response.totalRecords);
        console.log('✅ Current page:', response.currentPage);
        console.log('✅ Total pages:', response.totalPages);
        console.log('✅ Reminders count:', response.reminders?.length || 0);
        console.log('✅ First few reminders:', response.reminders?.slice(0, 3));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ GET ALL REMINDERS - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        console.error('❌ Full Error:', error);
        return this.handleError('getAllReminders', error);
      })
    );
  }

  getReminderById(agentId: string, reminderId: string): Observable<Reminder> {
    console.log('🔍 GET REMINDER BY ID - Starting...');
    console.log('🔍 AgentId:', agentId);
    console.log('🔍 ReminderId:', reminderId);

    const url = `${API_BASE}/${agentId}/${reminderId}`;
    console.log('🔍 Request URL:', url);

    return this.http.get<Reminder>(url).pipe(
      tap(response => {
        console.log('✅ GET REMINDER BY ID - Success:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ GET REMINDER BY ID - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        return this.handleError('getReminderById', error);
      })
    );
  }

  updateReminder(agentId: string, reminderId: string, body: UpdateReminderRequest): Observable<Reminder> {
    console.log('✏️ UPDATE REMINDER - Starting...');
    console.log('✏️ AgentId:', agentId);
    console.log('✏️ ReminderId:', reminderId);
    console.log('✏️ Request body:', JSON.stringify(body, null, 2));

    const url = `${API_BASE}/${agentId}/${reminderId}`;
    console.log('✏️ Request URL:', url);

    return this.http.put<Reminder>(url, body).pipe(
      tap(response => {
        console.log('✅ UPDATE REMINDER - Success:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ UPDATE REMINDER - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        return this.handleError('updateReminder', error);
      })
    );
  }

  deleteReminder(agentId: string, reminderId: string): Observable<any> {
    console.log('🗑️ DELETE REMINDER - Starting...');
    console.log('🗑️ AgentId:', agentId);
    console.log('🗑️ ReminderId:', reminderId);

    const url = `${API_BASE}/${agentId}/${reminderId}`;
    console.log('🗑️ Request URL:', url);

    return this.http.delete(url).pipe(
      tap(response => {
        console.log('✅ DELETE REMINDER - Success:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ DELETE REMINDER - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        return this.handleError('deleteReminder', error);
      })
    );
  }

  /** =====================
   * Actions
   * ===================== */
  completeReminder(agentId: string, reminderId: string, notes?: string): Observable<any> {
    console.log('✅ COMPLETE REMINDER - Starting...');
    console.log('✅ AgentId:', agentId);
    console.log('✅ ReminderId:', reminderId);
    console.log('✅ Notes:', notes);

    const url = `${API_BASE}/${agentId}/${reminderId}/complete`;
    const body = { notes };
    console.log('✅ Request URL:', url);
    console.log('✅ Request body:', body);

    return this.http.post(url, body).pipe(
      tap(response => {
        console.log('✅ COMPLETE REMINDER - Success:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ COMPLETE REMINDER - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        return this.handleError('completeReminder', error);
      })
    );
  }

  /** =====================
   * Filters
   * ===================== */
  getRemindersByType(agentId: string, type: string): Observable<Reminder[]> {
    console.log('🏷️ GET REMINDERS BY TYPE - Starting...');
    console.log('🏷️ AgentId:', agentId);
    console.log('🏷️ Type:', type);

    const url = `${API_BASE}/${agentId}/type/${type}`;
    console.log('🏷️ Request URL:', url);

    return this.http.get<Reminder[]>(url).pipe(
      tap(response => {
        console.log('✅ GET REMINDERS BY TYPE - Success:');
        console.log('✅ Found reminders:', response?.length || 0);
        console.log('✅ Reminders:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ GET REMINDERS BY TYPE - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        return this.handleError('getRemindersByType', error);
      })
    );
  }

  getRemindersByStatus(agentId: string, status: string): Observable<Reminder[]> {
    console.log('📊 GET REMINDERS BY STATUS - Starting...');
    console.log('📊 AgentId:', agentId);
    console.log('📊 Status:', status);

    const url = `${API_BASE}/${agentId}/status/${status}`;
    console.log('📊 Request URL:', url);

    return this.http.get<Reminder[]>(url).pipe(
      tap(response => {
        console.log('✅ GET REMINDERS BY STATUS - Success:');
        console.log('✅ Found reminders:', response?.length || 0);
        console.log('✅ Reminders:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ GET REMINDERS BY STATUS - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        return this.handleError('getRemindersByStatus', error);
      })
    );
  }

  /** =====================
   * Settings
   * ===================== */
  getSettings(agentId: string): Observable<ReminderSettings[]> {
    console.log('⚙️ GET SETTINGS - Starting...');
    console.log('⚙️ AgentId:', agentId);

    const url = `${API_BASE}/${agentId}/settings`;
    console.log('⚙️ Request URL:', url);

    return this.http.get<ReminderSettings[]>(url).pipe(
      tap(response => {
        console.log('✅ GET SETTINGS - Success:');
        console.log('✅ Settings count:', response?.length || 0);
        console.log('✅ Settings:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ GET SETTINGS - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        return this.handleError('getSettings', error);
      })
    );
  }

  updateSettings(agentId: string, settings: ReminderSettings): Observable<any> {
    console.log('⚙️ UPDATE SETTINGS - Starting...');
    console.log('⚙️ AgentId:', agentId);
    console.log('⚙️ Settings:', JSON.stringify(settings, null, 2));

    const url = `${API_BASE}/${agentId}/settings`;
    console.log('⚙️ Request URL:', url);

    return this.http.put(url, settings).pipe(
      tap(response => {
        console.log('✅ UPDATE SETTINGS - Success:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ UPDATE SETTINGS - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        return this.handleError('updateSettings', error);
      })
    );
  }

  /** =====================
   * Utility
   * ===================== */
  getStatistics(agentId: string): Observable<ReminderStatistics> {
    console.log('📊 GET STATISTICS - Starting...');
    console.log('📊 AgentId:', agentId);

    const url = `${API_BASE}/${agentId}/statistics`;
    console.log('📊 Request URL:', url);

    return this.http.get<ReminderStatistics>(url).pipe(
      tap(response => {
        console.log('✅ GET STATISTICS - Success:');
        console.log('✅ Statistics:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ GET STATISTICS - Error:');
        console.error('❌ Status:', error.status);
        console.error('❌ Status Text:', error.statusText);
        console.error('❌ Error Body:', error.error);
        return this.handleError('getStatistics', error);
      })
    );
  }

  /** =====================
   * Error Handling
   * ===================== */
  private handleError(methodName: string, error: HttpErrorResponse): Observable<never> {
    console.error(`🚨 ${methodName.toUpperCase()} - DETAILED ERROR ANALYSIS:`);
    console.error('🚨 Method:', methodName);
    console.error('🚨 Error status:', error.status);
    console.error('🚨 Error message:', error.message);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.status === 0) {
      console.error('🚨 Network Error - Server might be down or CORS issue');
      errorMessage = 'Network error - please check if server is running';
    } else if (error.status === 404) {
      console.error('🚨 Not Found - Check if the endpoint exists');
      errorMessage = 'Resource not found';
    } else if (error.status === 401) {
      console.error('🚨 Unauthorized - Check authentication');
      errorMessage = 'Unauthorized access';
    } else if (error.status === 403) {
      console.error('🚨 Forbidden - Check permissions');
      errorMessage = 'Access forbidden';
    } else if (error.status >= 500) {
      console.error('🚨 Server Error - Check backend logs');
      errorMessage = 'Server error';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('🚨 Final error message:', errorMessage);
    return throwError(() => new Error(`${methodName}: ${errorMessage}`));
  }
}