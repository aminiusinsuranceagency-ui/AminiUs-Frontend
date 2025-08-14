// src/app/services/autocomplete.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// =====================
// INTERFACES
// =====================
export interface Company {
  companyId: string;
  companyName: string;
}

export interface PolicyType {
  typeId: string;
  typeName: string;
}

export interface PolicyCategory {
  categoryId: string;
  categoryName: string;
}

export interface PolicyCatalogItem {
  policyCatalogId: string;
  policyName: string;
}

export interface PolicyTemplate {
  templateId: string;
  templateName: string;
}

export interface ClientPolicy {
  policyId: string;
  policyName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AutocompleteService {
  private readonly baseUrl = 'http://localhost:3000/api/policies/autocomplete';

  constructor(private http: HttpClient) {}

  // =====================
  // STATIC AUTOCOMPLETE
  // =====================
  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.baseUrl}/companies`)
      .pipe(catchError(this.handleError));
  }

  getPolicyTypes(): Observable<PolicyType[]> {
    return this.http.get<PolicyType[]>(`${this.baseUrl}/types`)
      .pipe(catchError(this.handleError));
  }

  getPolicyCategories(): Observable<PolicyCategory[]> {
    return this.http.get<PolicyCategory[]>(`${this.baseUrl}/categories`)
      .pipe(catchError(this.handleError));
  }

  // =====================
  // DYNAMIC AUTOCOMPLETE
  // =====================
  getPolicyCatalog(filters: {
    agentId?: string;
    companyId?: string;
    typeId?: string;
    searchTerm?: string;
  }): Observable<PolicyCatalogItem[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });

    return this.http.get<PolicyCatalogItem[]>(`${this.baseUrl}/catalog`, { params })
      .pipe(catchError(this.handleError));
  }

  getPolicyTemplates(filters: {
    agentId?: string;
    typeId?: string;
    categoryId?: string;
    searchTerm?: string;
  }): Observable<PolicyTemplate[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });

    return this.http.get<PolicyTemplate[]>(`${this.baseUrl}/templates`, { params })
      .pipe(catchError(this.handleError));
  }

  getClientPolicies(filters: {
    clientId?: string;
    agentId?: string;
    searchTerm?: string;
  }): Observable<ClientPolicy[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });

    return this.http.get<ClientPolicy[]>(`${this.baseUrl}/client-policies`, { params })
      .pipe(catchError(this.handleError));
  }

  // =====================
  // ERROR HANDLING
  // =====================
  private handleError(error: HttpErrorResponse) {
    console.error('Autocomplete API error:', error);
    let errorMessage = 'An unknown error occurred while fetching autocomplete data';
    if (error.error instanceof ErrorEvent) {
      // Client-side/network error
      errorMessage = `Client/network error: ${error.error.message}`;
    } else if (error.status) {
      // Backend error with status code
      errorMessage = `Server returned code ${error.status}: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}
