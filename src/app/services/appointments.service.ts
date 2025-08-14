import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap, take } from 'rxjs/operators';
import { SessionService } from './session.service';

export interface Appointment {
  appointmentId: string;
  clientId: string;
  agentId: string;
  clientName: string;
  clientPhone?: string;
  title: string;
  description?: string;
  appointmentDate: string | Date;
  startTime: string;
  endTime: string;
  location?: string;
  type: 'Call' | 'Meeting' | 'Site Visit' | 'Policy Review' | 'Claim Processing';
  status: 'Scheduled' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rescheduled';
  priority: 'High' | 'Medium' | 'Low';
  notes?: string;
  reminderSet: boolean;
  createdDate: string;
  modifiedDate?: string | Date;
  isActive: boolean;
  clientEmail?: string;
  clientAddress?: string;
    formattedTime?: string;

}

export interface CreateAppointmentRequest {
  clientId: string;
  title: string;
  description?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  type: 'Call' | 'Meeting' | 'Site Visit' | 'Policy Review' | 'Claim Processing';
  priority?: 'High' | 'Medium' | 'Low';
  notes?: string;
  reminderSet?: boolean;
}

export interface UpdateAppointmentRequest {
   clientId?: string;
  title?: string;
  description?: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  type?: 'Call' | 'Meeting' | 'Site Visit' | 'Policy Review' | 'Claim Processing';
  priority?: 'High' | 'Medium' | 'Low';
  notes?: string;
  reminderSet?: boolean;
}

export interface AppointmentFilters {
  pageSize?: number;
  pageNumber?: number;
  status?: string;
  type?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  searchTerm?: string;
}

export interface WeekViewData {
  date: string;
  dayName: string;
  appointments: Appointment[];
}

export interface CalendarViewData {
  date: string;
  appointmentCount: number;
  appointments: Appointment[];
}

export interface AppointmentStatistics {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  completedCount: number;
  totalAppointments: number;
  todayAppointments: number;
  weekAppointments: number;
  monthAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  statusBreakdown: { [key: string]: number };
  typeBreakdown: { [key: string]: number };
  scheduledCount: number;
  confirmedCount: number;
  cancelledCount: number;
}

export interface ConflictCheckRequest {
  appointmentDate: string;
  startTime: string;
  endTime: string;
  excludeAppointmentId?: string;
}

export interface ConflictCheckResponse {
  conflicts: any;
  hasConflicts: boolean;
  conflictingAppointments?: Appointment[];
  message?: string;
}
export interface ClientSearchResult {
  clientId: string;
  clientName: string;
  phone?: string;
  email?: string;
  address?: string;
  policyNumber?: string;
  status?: string;
  
}

export interface ClientSearchResponse {
  clients?: ClientSearchResult[];
  data?: ClientSearchResult[];
  // Handle different response formats
}
@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private baseUrl = 'http://localhost:3000/api/appointments';

  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  public appointments$ = this.appointmentsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private sessionService: SessionService
  ) {}

  // --- Helpers ------------------------------------------------------------

  /** Return current agentId from session; do not mutate case. */
  private getAgentId(): string | null {
    const agentId = this.sessionService.getAgentId();
    return agentId || null;
  }

  /** Build HttpHeaders with JSON + optional Authorization */
  private buildHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.sessionService.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /** Unified HTTP options */
  private httpOptions() {
    return { headers: this.buildHeaders() };
  }

  /** Convert filter object into HttpParams (skips undefined/empty) */
  private buildParams(filters?: AppointmentFilters): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;

    Object.keys(filters).forEach(key => {
      const value = (filters as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  /** Centralised error handler */
  private handleError(operation = 'operation') {
    return (error: any): Observable<never> => {
      console.error(`${operation} failed:`, error);

      // If auth error, force logout (SessionService.logout exists in your code)
      if (error && error.status === 401) {
        try {
          this.sessionService.logout(false);
        } catch (e) {
          // fallback: clear session if logout fails
          (this.sessionService as any).clearSession?.();
        }
        return throwError(() => new Error('Session expired. Please log in again.'));
      }

      // If backend returned plain text or other unexpected body, normalise message
      let errorMessage = 'An error occurred';
      try {
        if (error && error.error && typeof error.error === 'string') {
          // sometimes servers return text/html or plain text errors
          errorMessage = error.error;
        } else if (error && error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error && error.message) {
          errorMessage = error.message;
        } else if (error && error.statusText) {
          errorMessage = `${error.status} ${error.statusText}`;
        }
      } catch (e) {
        errorMessage = 'An unknown error occurred';
      }

      return throwError(() => new Error(errorMessage));
    };
  }

  // --- CRUD + Queries ----------------------------------------------------

  /** Create an appointment */
private normalizeTime(time: string): string {
  if (!time) return time;
  return time.length === 5 ? `${time}:00` : time; // add seconds if missing
}

create(payload: CreateAppointmentRequest): Observable<any> {
  const agentId = this.getAgentId();
  if (!agentId) {
    return throwError(() => new Error('Agent ID not available'));
  }

  // Ensure times are in HH:mm:ss format
  payload = {
    ...payload,
    startTime: this.normalizeTime(payload.startTime),
    endTime: this.normalizeTime(payload.endTime)
  };

  const url = `${this.baseUrl}/${encodeURIComponent(agentId)}`;

  return this.http.post<any>(url, payload, this.httpOptions()).pipe(
    tap(() => this.refreshAppointments()),
    catchError((error) => {
      console.error('Create appointment failed:', error);
      return this.handleError('create appointment')(error);
    })
  );
}


  /** Update an appointment */
  update(appointmentId: string, payload: UpdateAppointmentRequest): Observable<any> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    return this.http.put<any>(`${this.baseUrl}/${agentId}/${appointmentId}`, payload, this.httpOptions())
      .pipe(
        tap(() => this.refreshAppointments()),
        catchError(this.handleError('update appointment'))
      );
  }

  /** Delete an appointment */
  delete(appointmentId: string): Observable<any> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    return this.http.delete<any>(`${this.baseUrl}/${agentId}/${appointmentId}`, this.httpOptions())
      .pipe(
        tap(() => this.refreshAppointments()),
        catchError(this.handleError('delete appointment'))
      );
  }

  /** Get appointment by ID */
  getById(appointmentId: string): Observable<Appointment> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    return this.http.get<Appointment>(`${this.baseUrl}/${agentId}/${appointmentId}`, this.httpOptions())
      .pipe(
        catchError(this.handleError('get appointment by ID'))
      );
  }

  /** Get all appointments (with optional filters) */
  getAll(filters?: AppointmentFilters): Observable<Appointment[]> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    const params = this.buildParams(filters);
    return this.http.get<Appointment[]>(`${this.baseUrl}/${agentId}`, { ...this.httpOptions(), params })
      .pipe(
        tap(appointments => this.appointmentsSubject.next(appointments || [])),
        catchError(this.handleError('get all appointments'))
      );
  }

  /** Alias kept for backwards compatibility */
  getAllAppointments(filters?: AppointmentFilters): Observable<Appointment[]> {
    return this.getAll(filters);
  }

  /** Get today's appointments */
  getToday(): Observable<Appointment[]> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    return this.http.get<Appointment[]>(`${this.baseUrl}/${agentId}/today`, this.httpOptions())
      .pipe(
        tap(appointments => {
          // update cache only if we get an array
          if (Array.isArray(appointments)) {
            this.appointmentsSubject.next(appointments);
          }
        }),
        catchError(this.handleError('get today appointments'))
      );
  }

  /** Get appointments for a specific date (query parameter) */
  getForDate(appointmentDate: string): Observable<Appointment[]> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    const params = new HttpParams().set('appointmentDate', appointmentDate);
    return this.http.get<Appointment[]>(`${this.baseUrl}/${agentId}/date`, { ...this.httpOptions(), params })
      .pipe(catchError(this.handleError('get appointments for date')));
  }

  /** Get week view appointments */
  getWeekView(weekStartDate?: string): Observable<WeekViewData[]> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    let params = new HttpParams();
    if (weekStartDate) params = params.set('weekStartDate', weekStartDate);

    return this.http.get<WeekViewData[]>(`${this.baseUrl}/${agentId}/week`, { ...this.httpOptions(), params })
      .pipe(catchError(this.handleError('get week view appointments')));
  }

  /** Get calendar view appointments */
  getCalendar(month: number, year: number): Observable<CalendarViewData[]> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    const params = new HttpParams().set('month', String(month)).set('year', String(year));
    return this.http.get<CalendarViewData[]>(`${this.baseUrl}/${agentId}/calendar`, { ...this.httpOptions(), params })
      .pipe(catchError(this.handleError('get calendar appointments')));
  }

  /** Update appointment status */
  updateStatus(appointmentId: string, status: string): Observable<any> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    return this.http.put<any>(`${this.baseUrl}/${agentId}/${appointmentId}/status`, { status }, this.httpOptions())
      .pipe(
        tap(() => this.refreshAppointments()),
        catchError(this.handleError('update appointment status'))
      );
  }

  /** Search appointments */
  search(searchTerm: string): Observable<Appointment[]> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<Appointment[]>(`${this.baseUrl}/${agentId}/search`, { ...this.httpOptions(), params })
      .pipe(catchError(this.handleError('search appointments')));
  }

  /** Check for time conflicts */
  checkConflicts(payload: ConflictCheckRequest): Observable<ConflictCheckResponse> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    return this.http.post<ConflictCheckResponse>(`${this.baseUrl}/${agentId}/check-conflicts`, payload, this.httpOptions())
      .pipe(catchError(this.handleError('check time conflicts')));
  }

  /** Get appointment statistics */
  getStatistics(): Observable<AppointmentStatistics> {
    const agentId = this.getAgentId();
    if (!agentId) return throwError(() => new Error('Agent ID not available'));

    return this.http.get<AppointmentStatistics>(`${this.baseUrl}/${agentId}/statistics`, this.httpOptions())
      .pipe(catchError(this.handleError('get appointment statistics')));
  }
searchClients(agentId: string, query: string) {
  return this.http.get<any[]>(
    `${this.baseUrl}/appointments/${agentId}/clients/search`,
    { params: { q: query } }
  );
}
  // --- Cache / utilities -------------------------------------------------

  /** Refresh local appointments cache by calling getAll (no filters) */
  private refreshAppointments(): void {
    // take(1) ensures we unsubscribe after one emission
    this.getAll().pipe(take(1)).subscribe({
      next: (appointments) => {
        // appointmentsSubject updated inside getAll tap
        console.log('Appointments refreshed successfully. Count=', appointments?.length ?? 0);
      },
      error: (err) => {
        console.error('Failed to refresh appointments:', err);
        // do not throw - refresh failure is non-fatal for callers
      }
    });
  }

  /** Return cached appointments */
  getCachedAppointments(): Appointment[] {
    return this.appointmentsSubject.value;
  }

  /** Format Date helper -> YYYY-MM-DD */
  formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /** Ensure time is HH:MM:SS */
  formatTimeForApi(time: string): string {
    if (!time) return time;
    if (time.length === 5) return `${time}:00`;
    return time;
  }

  /** Build a CreateAppointmentRequest from form-like data */
  createAppointmentPayload(formData: any): CreateAppointmentRequest {
    return {
      clientId: formData.clientId,
      title: formData.title,
      description: formData.description,
      appointmentDate: this.formatDateForApi(new Date(formData.appointmentDate)),
      startTime: this.formatTimeForApi(formData.startTime),
      endTime: this.formatTimeForApi(formData.endTime),
      location: formData.location,
      type: formData.type,
      priority: formData.priority || 'Medium',
      notes: formData.notes,
      reminderSet: !!formData.reminderSet
    };
  }
  


  /** Build an UpdateAppointmentRequest from form-like data */
  createUpdateAppointmentPayload(formData: any): UpdateAppointmentRequest {
    const payload: UpdateAppointmentRequest = {};
    if (formData.title) payload.title = formData.title;
    if (formData.description) payload.description = formData.description;
    if (formData.appointmentDate) payload.appointmentDate = this.formatDateForApi(new Date(formData.appointmentDate));
    if (formData.startTime) payload.startTime = this.formatTimeForApi(formData.startTime);
    if (formData.endTime) payload.endTime = this.formatTimeForApi(formData.endTime);
    if (formData.location) payload.location = formData.location;
    if (formData.type) payload.type = formData.type;
    if (formData.priority) payload.priority = formData.priority;
    if (formData.notes) payload.notes = formData.notes;
    if (formData.reminderSet !== undefined) payload.reminderSet = !!formData.reminderSet;
    return payload;
  }

  formatAppointmentTime(appointment: Appointment): string {
  if (!appointment.appointmentDate || !appointment.startTime || !appointment.endTime) {
    return '';
  }

  const datePart = new Date(appointment.appointmentDate);

  const startDateTime = new Date(datePart);
  const [startHour, startMinute] = appointment.startTime.split(':').map(Number);
  startDateTime.setHours(startHour, startMinute);

  const endDateTime = new Date(datePart);
  const [endHour, endMinute] = appointment.endTime.split(':').map(Number);
  endDateTime.setHours(endHour, endMinute);

  return `${startDateTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • ${startDateTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${endDateTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

}
