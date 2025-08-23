// Reminder record
export interface Reminder {
    ReminderId: string;
    ClientId?: string;
    AppointmentId?: string;
    AgentId: string;
    ReminderType: 
        'Call' 
        | 'Visit' 
        | 'Policy Expiry' 
        | 'Maturing Policy' 
        | 'Birthday' 
        | 'Holiday' 
        | 'Custom' 
        | 'Appointment';   
    Title: string;
    Description?: string;
    ReminderDate: string; // ISO string for frontend
    ReminderTime?: string; 
    ClientName?: string;
    Priority: 'High' | 'Medium' | 'Low';
    Status: 'Active' | 'Completed' | 'Cancelled';
    EnableSMS: boolean;
    EnableWhatsApp: boolean;
    EnablePushNotification: boolean;
    AdvanceNotice: string;
    CustomMessage?: string;
    AutoSend: boolean;
    Notes?: string;
    CreatedDate: string;
    ModifiedDate: string;
    CompletedDate?: string;
    ClientPhone?: string;
    ClientEmail?: string;
    FullClientName?: string;
}


// Reminder settings
export interface ReminderSettings {
    ReminderSettingId: string;
    AgentId: string;
    ReminderType: 'Policy Expiry' | 'Birthday' | 'Appointment' | 'Call' | 'Visit';
    IsEnabled: boolean;
    DaysBefore: number;
    TimeOfDay: string; // SQL TIME format
    RepeatDaily: boolean;
    CreatedDate: string;
    ModifiedDate: string;
}

// Request to create a reminder
export interface CreateReminderRequest {
    ClientId?: string;
    AppointmentId?: string;
    ReminderType: 'Call' | 'Visit' | 'Policy Expiry' | 'Birthday' | 'Holiday' | 'Custom';
    Title: string;
    Description?: string;
    ReminderDate: string;
    ReminderTime?: string;
    ClientName?: string;
    Priority?: 'High' | 'Medium' | 'Low';
    EnableSMS?: boolean;
    EnableWhatsApp?: boolean;
    EnablePushNotification?: boolean;
    AdvanceNotice?: string;
    CustomMessage?: string;
    AutoSend?: boolean;
    Notes?: string;
}

// Request to update a reminder
export interface UpdateReminderRequest {
    Title?: string;
    Description?: string;
    ReminderDate?: string;
    ReminderTime?: string;
    Priority?: 'High' | 'Medium' | 'Low';
    Status?: 'Active' | 'Completed' | 'Cancelled';
    EnableSMS?: boolean;
    EnableWhatsApp?: boolean;
    EnablePushNotification?: boolean;
    AdvanceNotice?: string;
    CustomMessage?: string;
    AutoSend?: boolean;
    Notes?: string;
}

// Filters for listing reminders
export interface ReminderFilters {
    ReminderType?: 'Call' | 'Visit' | 'Policy Expiry' | 'Birthday' | 'Holiday' | 'Custom';
    Status?: 'Active' | 'Completed' | 'Cancelled';
    Priority?: 'High' | 'Medium' | 'Low';
    StartDate?: string;
    EndDate?: string;
    ClientId?: string;
    PageSize?: number;
    PageNumber?: number;
}

// Paged reminder response
export interface PaginatedReminderResponse {
    reminders: Reminder[];
    totalRecords: number;
    currentPage: number;
    totalPages: number;
    pageSize: number;
}

// Birthday reminder view
export interface BirthdayReminder {
    ClientId: string;
    FirstName: string;
    Surname: string;
    LastName: string;
    PhoneNumber: string;
    Email: string;
    DateOfBirth: string;
    Age: number;
}

// Policy expiry reminder view
export interface PolicyExpiryReminder {
    PolicyId: string;
    ClientId: string;
    PolicyName: string;
    PolicyType: string;
    CompanyName: string;
    EndDate: string;
    FirstName: string;
    Surname: string;
    PhoneNumber: string;
    Email: string;
    DaysUntilExpiry: number;
}

// Phone validation response
export interface PhoneValidationResult {
    IsValid: boolean;
    FormattedNumber: string;
    ValidationMessage: string;
}

export interface ReminderStatistics {
  TotalActive: number;
  TotalCompleted: number;
  TodayReminders: number;
  UpcomingReminders: number;
  HighPriority: number;
  Overdue: number;
}