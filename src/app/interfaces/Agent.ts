// Core Agent interface matching backend database structure
export interface Agent {
  AgentId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  PasswordHash: string;
  Avatar?: string;
  CreatedDate: Date;
  ModifiedDate: Date;
  IsActive: boolean;
}

// Agent Settings interface matching backend structure
export interface AgentSettings {
  SettingId: string;
  AgentId: string;
  DarkMode: boolean;
  EmailNotifications: boolean;
  SmsNotifications: boolean;
  WhatsappNotifications: boolean;
  PushNotifications: boolean;
  SoundEnabled: boolean;
  CreatedDate: Date;
  ModifiedDate: Date;
}

// Extended Agent Profile that combines Agent + Settings
export interface AgentProfile extends Agent {
  Role: string;
  CompanyName: string;
  DarkMode?: boolean;
  EmailNotifications?: boolean;
  SmsNotifications?: boolean;
  WhatsappNotifications?: boolean;
  PushNotifications?: boolean;
  SoundEnabled?: boolean;
}

// Login Request - matches backend expectation
export interface LoginRequest {
  Email: string;
  Password: string; // Plain text password for login
}

// Login Response - matches backend response structure
export interface LoginResponse {
  Success: boolean;
  Message: string;
  AgentId?: string;
  Token?: string;
  AgentProfile?: string | AgentProfile; // Can be JSON string or parsed object
  StoredPasswordHash?: string;
}

// Registration Request - matches backend expectation exactly
export interface RegisterRequest {
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  PasswordHash: string; // Hashed password for registration
  Avatar?: string;
}

// Registration Response - matches backend response structure
export interface RegisterResponse {
  Success: boolean;
  Message: string;
  AgentId?: string;
}

// Password Change Request
export interface ChangePasswordRequest {
  AgentId: string;
  OldPasswordHash: string;
  NewPasswordHash: string;
}

// Generic Password Response
export interface PasswordResponse {
  Success: boolean;
  Message: string;
}

// Password Reset Request
export interface PasswordResetRequest {
  Email: string;
}

// Password Reset Response
export interface PasswordResetResponse {
  Success: boolean;
  Message: string;
  AgentId?: string;
  Email?: string;
}

// Insurance Company lookup data
export interface InsuranceCompany {
  CompanyId: string;
  CompanyName: string;
}

// Policy Type lookup data
export interface PolicyType {
  TypeId: string;
  TypeName: string;
}

// Form data interfaces for internal use
export interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// API Error Response structure
export interface ApiErrorResponse {
  Message?: string;
  error?: string;
  status?: number;
  statusText?: string;
}

// Session data structure for frontend session management
export interface SessionData {
  user: AgentProfile;
  token?: string;
  loginTime: string;
  rememberMe: boolean;
  agentId: string;
}

// Utility service interfaces (if available)
export interface EmailValidationResponse {
  IsValid: boolean;
  Message?: string;
}

export interface PhoneFormatResponse {
  FormattedPhoneNumber: string;
  IsValid: boolean;
  Message?: string;
}

export interface GreetingResponse {
  Greeting: string;
  Message?: string;
}

// HTTP request options
export interface RequestOptions {
  headers?: { [key: string]: string };
  timeout?: number;
  retries?: number;
}