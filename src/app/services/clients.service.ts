import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Client,
  ClientWithDetails,
  CreateClientRequest,
  UpdateClientRequest,
  ClientSearchFilters,
  ClientStatistics,
  Birthday
} from '../interfaces/client';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private baseUrl = 'https://aminius-backend.onrender.com/api/clients';

  constructor(private http: HttpClient) {}

  /** Upsert client (create or update depending on whether ClientId is present) */
  upsert(payload: any): Observable<{ success: boolean; clientId: string }> {
    const url = `${this.baseUrl}/upsert`;
    console.log('POST', url, 'payload:', payload);
    return this.http.post<{ success: boolean; clientId: string }>(url, payload);
  }

  /** Create a new client */
  create(payload: CreateClientRequest): Observable<Client> {
    const url = `${this.baseUrl}`;
    console.log('POST', url, 'payload:', payload);
    return this.http.post<Client>(url, payload);
  }

  /** Update an existing client */
  update(payload: UpdateClientRequest): Observable<Client> {
    const url = `${this.baseUrl}`;
    console.log('PUT', url, 'payload:', payload);
    return this.http.put<Client>(url, payload);
  }

  /** Get all clients (supports searchTerm, filterType, insuranceType) */
  getAll(agentId: string, filters?: Partial<ClientSearchFilters>): Observable<Client[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, String(value));
        }
      });
    }
    const url = `${this.baseUrl}/${agentId}`;
    console.log('GET', url, 'params:', params.toString());
    return this.http.get<Client[]>(url, { params });
  }

  /** Get client by ID */
  getById(agentId: string, clientId: string): Observable<Client> {
    const url = `${this.baseUrl}/${agentId}/${clientId}`;
    console.log('GET', url);
    return this.http.get<Client>(url);
  }

  /** Convert a prospect to a client */
  convert(agentId: string, clientId: string): Observable<{ success: boolean }> {
    const url = `${this.baseUrl}/${agentId}/${clientId}/convert`;
    console.log('PUT', url, '{}');
    return this.http.put<{ success: boolean }>(url, {});
  }

  /** Delete a client */
  delete(agentId: string, clientId: string): Observable<{ success: boolean }> {
    const url = `${this.baseUrl}/${agentId}/${clientId}`;
    console.log('DELETE', url);
    return this.http.delete<{ success: boolean }>(url);
  }

  /** Get client statistics */
  getStatistics(agentId: string): Observable<ClientStatistics> {
    const url = `${this.baseUrl}/${agentId}/statistics`;
    console.log('GET', url);
    return this.http.get<ClientStatistics>(url);
  }

  /** Get enhanced client statistics */
  getEnhancedStatistics(agentId: string): Observable<ClientStatistics> {
    const url = `${this.baseUrl}/${agentId}/statistics/enhanced`;
    console.log('GET', url);
    return this.http.get<ClientStatistics>(url);
  }

  /** Get today's birthdays */
  getBirthdays(agentId: string): Observable<Birthday[]> {
    const url = `${this.baseUrl}/${agentId}/birthdays`;
    console.log('GET', url);
    return this.http.get<Birthday[]>(url);
  }

  /** Get all clients with advanced filters & pagination */
  getAllPaginated(
    agentId: string,
    filters?: Partial<ClientSearchFilters>
  ): Observable<{ data: Client[]; totalCount: number }> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, String(value));
        }
      });
    }
    const url = `${this.baseUrl}/${agentId}/all/paginated`;
    console.log('GET', url, 'params:', params.toString());
    return this.http.get<{ data: Client[]; totalCount: number }>(url, { params });
  }

  /** Search clients */
  search(agentId: string, searchTerm: string): Observable<Client[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    const url = `${this.baseUrl}/${agentId}/search`;
    console.log('GET', url, 'params:', params.toString());
    return this.http.get<Client[]>(url, { params });
  }

  /** Get clients by insurance type */
  getByInsuranceType(agentId: string, insuranceType: string): Observable<Client[]> {
    const url = `${this.baseUrl}/${agentId}/insurance/${encodeURIComponent(insuranceType)}`;
    console.log('GET', url);
    return this.http.get<Client[]>(url);
  }

  /** Get client with policies */
  getWithPolicies(agentId: string, clientId: string): Observable<ClientWithDetails> {
    const url = `${this.baseUrl}/${agentId}/${clientId}/policies`;
    console.log('GET', url);
    return this.http.get<ClientWithDetails>(url);
  }
}
