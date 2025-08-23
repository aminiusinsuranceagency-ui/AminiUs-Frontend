import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DailyNote,
  SaveNotesResult,
  DeleteNotesResult,
  NotesDateRange
} from '../interfaces/Note'

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private baseUrl = 'http://localhost:3000/api/notes';

  constructor(private http: HttpClient) {}

  /** Get daily notes for a specific agent and date */
  getDailyNotes(agentId: string, noteDate: string): Observable<DailyNote[]> {
    return this.http.get<DailyNote[]>(`${this.baseUrl}/${agentId}/${noteDate}`);
  }

  /** Save (insert or update) daily notes */
  saveDailyNotes(agentId: string, noteDate: string, notes: string): Observable<SaveNotesResult> {
    return this.http.post<SaveNotesResult>(
      `${this.baseUrl}/${agentId}/${noteDate}`,
      { notes }
    );
  }

  /** Get all notes for an agent within an optional date range */
getAllNotes(agentId: string, range?: NotesDateRange): Observable<DailyNote[]> {
  let params = new HttpParams(); 

  if (range?.StartDate) {
    params = params.set('StartDate', range.StartDate);
  }
  if (range?.EndDate) {
    params = params.set('EndDate', range.EndDate);
  }

return this.http.get<DailyNote[]>(`${this.baseUrl}/all/${agentId}`, { params });
}

  /** Search notes by text content */
  searchNotes(agentId: string, searchTerm: string): Observable<DailyNote[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<DailyNote[]>(`${this.baseUrl}/search/${agentId}`, { params });
  }

  /** Delete notes for a specific date */
  deleteNotes(agentId: string, noteDate: string): Observable<DeleteNotesResult> {
    return this.http.delete<DeleteNotesResult>(`${this.baseUrl}/${agentId}/${noteDate}`);
  }
}

