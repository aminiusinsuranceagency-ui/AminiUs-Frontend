export interface DailyNote {
  NoteId: string;
  AgentId: string;
  NoteDate: string;
  Notes: string;
  CreatedDate: string;
  ModifiedDate: string;
}

export interface SaveNotesResult {
  RowsAffected: number;
}

export interface DeleteNotesResult {
  RowsAffected: number;
}

export interface NotesDateRange {
  StartDate?: string;
  EndDate?: string;
}
