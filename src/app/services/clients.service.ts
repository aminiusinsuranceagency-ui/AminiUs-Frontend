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
} from '../interfaces/client'
@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private baseUrl = 'https://aminius-backend.onrender.com/api/clients';


  constructor(private http: HttpClient) {}

  /** Upsert client (create or update depending on whether ClientId is present) */
  upsert(payload: any): Observable<{ success: boolean; clientId: string }> {
    return this.http.post<{ success: boolean; clientId: string }>(
      `${this.baseUrl}/upsert`,
      payload
    );
  }

  /** Create a new client */
  create(payload: CreateClientRequest): Observable<Client> {
    return this.http.post<Client>(`${this.baseUrl}`, payload);
  }

  /** Update an existing client */
  update(payload: UpdateClientRequest): Observable<Client> {
    return this.http.put<Client>(`${this.baseUrl}`, payload);
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
    return this.http.get<Client[]>(`${this.baseUrl}/${agentId}`, { params });
  }

  /** Get client by ID */
  getById(agentId: string, clientId: string): Observable<Client> {
    return this.http.get<Client>(`${this.baseUrl}/${agentId}/${clientId}`);
  }

  /** Convert a prospect to a client */
  convert(agentId: string, clientId: string): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(
      `${this.baseUrl}/${agentId}/${clientId}/convert`,
      {}
    );
  }

  /** Delete a client */
  delete(agentId: string, clientId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${agentId}/${clientId}`
    );
  }

  /** Get client statistics */
  getStatistics(agentId: string): Observable<ClientStatistics> {
    return this.http.get<ClientStatistics>(`${this.baseUrl}/${agentId}/statistics`);
  }

  /** Get enhanced client statistics */
  getEnhancedStatistics(agentId: string): Observable<ClientStatistics> {
    return this.http.get<ClientStatistics>(
      `${this.baseUrl}/${agentId}/statistics/enhanced`
    );
  }

  /** Get today's birthdays */
  getBirthdays(agentId: string): Observable<Birthday[]> {
    return this.http.get<Birthday[]>(`${this.baseUrl}/${agentId}/birthdays`);
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
    return this.http.get<{ data: Client[]; totalCount: number }>(
      `${this.baseUrl}/${agentId}/all/paginated`,
      { params }
    );
  }

  /** Search clients */
  search(agentId: string, searchTerm: string): Observable<Client[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<Client[]>(`${this.baseUrl}/${agentId}/search`, { params });
  }

  /** Get clients by insurance type */
  getByInsuranceType(agentId: string, insuranceType: string): Observable<Client[]> {
    return this.http.get<Client[]>(
      `${this.baseUrl}/${agentId}/insurance/${encodeURIComponent(insuranceType)}`
    );
  }

  /** Get client with policies */
  getWithPolicies(agentId: string, clientId: string): Observable<ClientWithDetails> {
    return this.http.get<ClientWithDetails>(
      `${this.baseUrl}/${agentId}/${clientId}/policies`
    );
  }
}


