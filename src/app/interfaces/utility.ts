// =========================
// Utility Function Results
// =========================

export interface GreetingResult {
  Greeting: string;
}

export interface ParsedTemplateResult {
  ParsedTemplate: string;
}

export interface RandomPasswordResult {
  RandomPassword: string;
}

export interface TemplateData {
  ClientName?: string;
  AgentName?: string;
  PolicyType?: string;
  ExpiryDate?: string;
  CompanyName?: string;
}

// =========================
// Validation Results
// =========================

export interface ValidationResult {
  IsValid: boolean;
  ValidationMessage: string;
}

export interface NationalIdValidationResult extends ValidationResult {
  FormattedNationalId: string;
}

export interface PhoneNumberFormatResult {
  FormattedPhoneNumber: string;
}

export interface DataIntegrityIssue {
  IssueType: string;
  IssueCount: number;
  Description: string;
}

// =========================
// Notifications
// =========================

export interface NotificationResult {
  NotificationId: string;
  Success: boolean;
}

export type NotificationType = "Email" | "SMS" | "WhatsApp" | "Push";

export type NotificationStatus =
  | "Pending"
  | "Sent"
  | "Failed"
  | "Cancelled";

export interface Notification {
  NotificationId: string;
  NotificationType: NotificationType;
  Recipient: string;
  Subject?: string;
  Body: string;
  Status: NotificationStatus;
  ScheduledTime?: string;
  SentTime?: string;
  ErrorMessage?: string;
  RetryCount: number;
  CreatedDate: string;
}

export interface ScheduledNotification {
  NotificationId: string;
  AgentId: string;
  NotificationType: NotificationType;
  Recipient: string;
  Subject?: string;
  Body: string;
  ScheduledTime: string;
}

export interface NotificationHistoryRequest {
  StartDate?: string;
  EndDate?: string;
  NotificationType?: NotificationType;
  Status?: NotificationStatus;
  PageSize?: number;
  PageNumber?: number;
}

export interface NotificationHistoryResult {
  notifications: Notification[];
  totalRecords: number;
}

export interface UpdateNotificationStatusResult {
  RowsAffected: number;
}

export interface CancelNotificationResult {
  RowsAffected: number;
}
