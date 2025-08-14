export interface GlobalSearchResult {
  EntityType: "Client" | "Appointment" | "Policy" | "Reminder";
  EntityId: string;
  Title: string;
  Subtitle: string;
  Detail1: string;
  Detail2: string;
  Status: string;
}

export interface SearchClient {
  ClientId: string;
  FirstName: string;
  Surname: string;
  LastName: string;
  PhoneNumber: string;
  Email: string;
  Address: string;
  NationalId: string;
  DateOfBirth: string;
  IsClient: boolean;
  InsuranceType: string;
  Notes: string;
  CreatedDate: string;
  ModifiedDate: string;
  ClientType: string;
}

export interface SearchAppointment {
  AppointmentId: string;
  ClientId: string;
  ClientName: string;
  ClientPhone: string;
  Title: string;
  Description: string;
  AppointmentDate: string;
  StartTime: string;
  EndTime: string;
  Location: string;
  Type: string;
  Status: string;
  Priority: string;
  Notes: string;
  CreatedDate: string;
}

export interface SearchPolicy {
  PolicyCatalogId: string;
  PolicyName: string;
  PolicyType: string;
  CompanyId: string;
  CompanyName: string;
  Notes: string;
  IsActive: boolean;
  CreatedDate: string;
  ModifiedDate: string;
}

export interface SearchReminder {
  ReminderId: string;
  ClientId: string;
  AppointmentId: string;
  ReminderType: string;
  Title: string;
  Description: string;
  ReminderDate: string;
  ReminderTime: string;
  ClientName: string;
  Priority: string;
  Status: string;
  Notes: string;
  CreatedDate: string;
}

export interface SearchSuggestion {
  Suggestion: string;
}

export interface SearchHistory {
  SearchTerm: string;
  SearchCount: number;
  LastSearched: string;
}
